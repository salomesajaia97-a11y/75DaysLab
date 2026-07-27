// One-off migration: make { userId, date } unique on `journalentries`.
//
// JournalEntry used to declare a NON-unique { userId, date } index. Mongo cannot
// convert an index in place — createIndex with different options on the same key
// raises IndexOptionsConflict and the old index silently stays — so the unique
// constraint the model now declares will NOT appear in an existing database
// until this script runs.
//
// What it does, in order:
//   1. merge every duplicate { userId, date } group into one document
//   2. delete the leftovers
//   3. drop the old non-unique { userId, date } index and recreate it as unique
//   4. verify the end state and fail loudly if it is not exactly right
//
// Grouping is by userId AND date, so two users who journalled the same day are
// never combined. All merge/grouping/index logic lives in lib/journal-migration.ts
// and is unit-tested; this file only does I/O.
//
// Usage (from the repository root, with .env.local present):
//   node scripts/dedupe-journal-entries.mts            # DRY RUN, writes nothing
//   node scripts/dedupe-journal-entries.mts --apply    # perform the migration
//
// Idempotent: re-running after a successful apply is a no-op. Exits non-zero on
// any failure. Node prints a MODULE_TYPELESS_PACKAGE_JSON warning for the
// imported .ts helper (the package is not "type": "module"); silence it with
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/dedupe-journal-entries.mts

import { MongoClient, ObjectId } from 'mongodb'
import { readFileSync } from 'node:fs'
import {
  JOURNAL_INDEX_KEY,
  JOURNAL_INDEX_NAME,
  groupByOwnerDay,
  indexGoalMet,
  isMeaningful,
  planIndexChange,
  planMigration,
  redactMongoUri,
  type IndexInfo,
  type RawJournalDoc,
} from '../lib/journal-migration.ts'

const COLLECTION = 'journalentries'
const APPLY = process.argv.includes('--apply')

/** Never let a connection string reach stdout/stderr. */
function say(...parts: unknown[]): void {
  console.log(redactMongoUri(parts.map((p) => (typeof p === 'string' ? p : JSON.stringify(p))).join(' ')))
}

function die(message: string, err?: unknown): never {
  const detail = err instanceof Error ? err.message : err === undefined ? '' : String(err)
  console.error(redactMongoUri(`FAILED: ${message}${detail ? ` — ${detail}` : ''}`))
  process.exit(1)
}

function readMongoUri(): string {
  let raw: string
  try {
    raw = readFileSync('.env.local', 'utf8')
  } catch (err) {
    die('could not read .env.local (run from the repository root)', err)
  }
  const line = raw.split('\n').find((l) => l.trimStart().startsWith('MONGODB_URI='))
  if (!line) die('MONGODB_URI is not set in .env.local')
  const uri = line.slice(line.indexOf('=') + 1).trim()
  if (!uri) die('MONGODB_URI is empty')
  return uri
}

const client = new MongoClient(readMongoUri())

try {
  await client.connect()
} catch (err) {
  die('could not connect to MongoDB', err)
}

try {
  const db = client.db()
  // Untyped handle on purpose: RawJournalDoc models the collection as it
  // really is (nothing trusted, `_id: unknown`), which the driver's Filter<T>
  // generic cannot express. Reads are cast at the boundary instead.
  const entries = db.collection(COLLECTION)
  const readAll = async (): Promise<RawJournalDoc[]> =>
    (await entries.find({}).toArray()) as unknown as RawJournalDoc[]

  say(`mode: ${APPLY ? 'APPLY (writes enabled)' : 'DRY RUN (no writes)'}`)
  say(`database: ${db.databaseName}   collection: ${COLLECTION}`)
  say('')

  // ---------------------------------------------------------------- inspect
  const indexesBefore = (await entries.listIndexes().toArray()) as unknown as IndexInfo[]
  say('current indexes:')
  for (const i of indexesBefore) {
    say(`  ${i.name}  key=${JSON.stringify(i.key)}  unique=${i.unique === true}`)
  }

  const docs = await readAll()
  const groups = groupByOwnerDay(docs)
  const plans = planMigration(docs)

  const affectedUsers = new Set(plans.map((p) => p.userId))
  const deleteCount = plans.reduce((n, p) => n + p.deleteIds.length, 0)
  const readingConflicts = plans.filter((p) =>
    p.conflicts.some((c) => c.field === 'bookTitle' || c.field === 'notes' || c.field === 'pagesRead')
  )
  const reflectionConflicts = plans.filter((p) =>
    p.conflicts.some((c) => !['bookTitle', 'notes', 'pagesRead'].includes(c.field))
  )

  say('')
  say('--- survey ---')
  say(`total documents:                 ${docs.length}`)
  say(`distinct { userId, date } groups: ${groups.size}`)
  say(`duplicate groups:                ${plans.length}`)
  say(`documents that would be removed: ${deleteCount}`)
  say(`distinct affected users:         ${affectedUsers.size}`)
  say(`groups with reading conflicts:   ${readingConflicts.length}`)
  say(`groups with reflection conflicts:${reflectionConflicts.length}`)
  // planMigration/planGroupMerge call assertSingleOwnerDay on every group, so
  // reaching this line at all proves no group spanned two users or two dates.
  say(`cross-user grouping detected:    no (asserted per group)`)

  // ------------------------------------------------------------ per group
  if (plans.length > 0) {
    say('')
    say('--- per-group plan ---')
    for (const plan of plans) {
      say(`user ${plan.userId}  date ${plan.date}`)
      say(`  keep   ${plan.survivorId}`)
      say(`  delete ${plan.deleteIds.join(', ')}`)
      if (Object.keys(plan.set).length > 0) {
        const merged = Object.entries(plan.set)
          .map(([k, v]) => `${k}=${isMeaningful(v) ? JSON.stringify(v) : String(v)}`)
          .join(', ')
        say(`  merge  ${merged}`)
      } else {
        say('  merge  (nothing — survivor already holds every winning value)')
      }
      for (const c of plan.conflicts) {
        say(`  CONFLICT ${c.field}: ${JSON.stringify(c.values)} -> kept ${JSON.stringify(c.chosen)}`)
      }
    }
  }

  const indexPlan = planIndexChange(indexesBefore)
  say('')
  say(`index plan: ${indexPlan.action} (${indexPlan.reason})`)

  // ------------------------------------------------------------- dry run
  if (!APPLY) {
    say('')
    say('DRY RUN complete. No documents and no indexes were modified.')
    say('Re-run with --apply to perform the migration.')
    await client.close()
    process.exit(0)
  }

  // --------------------------------------------------------------- apply
  say('')
  say('--- applying ---')
  let merged = 0
  let deleted = 0

  for (const plan of plans) {
    // Defence in depth: re-read the exact documents about to be touched and
    // confirm they really are one user + one date before deleting anything.
    const ids = [plan.survivorId, ...plan.deleteIds].map((id) => new ObjectId(id))
    const live = (await entries.find({ _id: { $in: ids } }).toArray()) as unknown as RawJournalDoc[]
    const owners = new Set(live.map((d) => String(d.userId)))
    const dates = new Set(live.map((d) => String(d.date)))
    if (owners.size !== 1 || dates.size !== 1) {
      die(
        `refusing to merge: group ${plan.userId}/${plan.date} resolved to ` +
          `${owners.size} owner(s) and ${dates.size} date(s)`
      )
    }

    if (Object.keys(plan.set).length > 0) {
      const res = await entries.updateOne({ _id: new ObjectId(plan.survivorId) }, { $set: plan.set })
      if (res.matchedCount !== 1) die(`survivor ${plan.survivorId} not found while merging`)
      merged++
    }

    const res = await entries.deleteMany({
      // Scoped by owner AND date as well as _id, so a stale plan can never
      // delete a document that belongs to somebody else.
      _id: { $in: plan.deleteIds.map((id) => new ObjectId(id)) },
      userId: live[0].userId,
      date: plan.date,
    })
    if (res.deletedCount !== plan.deleteIds.length) {
      die(
        `expected to delete ${plan.deleteIds.length} document(s) for ${plan.userId}/${plan.date}, ` +
          `deleted ${res.deletedCount}`
      )
    }
    deleted += res.deletedCount
  }

  say(`merged ${merged} surviving document(s), deleted ${deleted} duplicate(s)`)

  // --------------------------------------------------------------- index
  if (indexPlan.action === 'recreate') {
    try {
      await entries.dropIndex(indexPlan.dropName)
      say(`dropped index '${indexPlan.dropName}'`)
    } catch (err) {
      die(`could not drop index '${indexPlan.dropName}'`, err)
    }
  }

  if (indexPlan.action !== 'none') {
    try {
      const name = await entries.createIndex(JOURNAL_INDEX_KEY, {
        unique: true,
        name: JOURNAL_INDEX_NAME,
      })
      say(`created unique index '${name}'`)
    } catch (err) {
      die('could not create the unique { userId, date } index', err)
    }
  } else {
    say('index already unique — nothing to do')
  }

  // -------------------------------------------------------------- verify
  const indexesAfter = (await entries.listIndexes().toArray()) as unknown as IndexInfo[]
  say('')
  say('final indexes:')
  for (const i of indexesAfter) {
    say(`  ${i.name}  key=${JSON.stringify(i.key)}  unique=${i.unique === true}`)
  }
  if (!indexGoalMet(indexesAfter)) {
    die('verification failed: { userId: 1, date: 1 } is missing or still not unique')
  }

  const remaining = planMigration(await readAll())
  if (remaining.length > 0) {
    die(`verification failed: ${remaining.length} duplicate { userId, date } group(s) remain`)
  }

  say('')
  say('OK: { userId: 1, date: 1 } is unique and no duplicate user-days remain.')
} catch (err) {
  die('migration aborted', err)
} finally {
  await client.close().catch(() => {})
}
