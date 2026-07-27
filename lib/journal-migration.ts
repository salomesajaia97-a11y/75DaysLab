// PURE logic for the one-off journal unique-index migration.
//
// Dependency-free on purpose: `scripts/dedupe-journal-entries.mts` imports this
// file directly through Node's built-in TypeScript stripping, so it must not
// reference `@/` path aliases, mongoose, or any app module. Everything here is
// deterministic and unit-tested in ./journal-migration.test.ts — the script
// itself only does I/O.
//
// Context: JournalEntry historically carried a NON-unique { userId, date }
// index, so a legacy collection can hold more than one row for the same
// user-day. The unique index cannot build until those are merged.

/** The shape read off the raw collection (driver-level, nothing is trusted). */
export interface RawJournalDoc {
  _id: unknown
  userId: unknown
  date: unknown
  bookTitle?: unknown
  pagesRead?: unknown
  notes?: unknown
  mood?: unknown
  title?: unknown
  reflection?: unknown
  gratitude?: unknown
  tomorrowFocus?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

/** Reading-log fields. Free text is merged; pagesRead takes the maximum. */
export const READING_TEXT_FIELDS = ['bookTitle', 'notes'] as const
/** Reflection fields. All free text. */
export const REFLECTION_TEXT_FIELDS = ['mood', 'title', 'reflection', 'gratitude', 'tomorrowFocus'] as const
/** Every free-text field merged by "newest meaningful value wins". */
export const MERGED_TEXT_FIELDS = [...READING_TEXT_FIELDS, ...REFLECTION_TEXT_FIELDS] as const

export type MergedTextField = (typeof MERGED_TEXT_FIELDS)[number]

/** The compound index this migration guarantees. */
export const JOURNAL_INDEX_KEY: Readonly<Record<string, number>> = { userId: 1, date: 1 }
export const JOURNAL_INDEX_NAME = 'userId_1_date_1'

/** A value counts as "meaningful" only when it is a non-blank string. */
export function isMeaningful(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** Stable identity for a document, used for deterministic tie-breaking. */
function idOf(doc: RawJournalDoc): string {
  return String(doc._id)
}

function timeOf(value: unknown): number | null {
  if (value instanceof Date) {
    const t = value.getTime()
    return Number.isNaN(t) ? null : t
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const t = new Date(value).getTime()
    return Number.isNaN(t) ? null : t
  }
  return null
}

/**
 * The owner-day key. BOTH the user and the date participate, so two users who
 * journalled the same date are never in the same group — the uniqueness rule is
 * "one document per user per date", never "one document per date".
 */
export function ownerDayKey(doc: RawJournalDoc): string {
  return `${String(doc.userId)}|${String(doc.date)}`
}

/** Group documents by { userId, date }. Insertion order is preserved. */
export function groupByOwnerDay(docs: RawJournalDoc[]): Map<string, RawJournalDoc[]> {
  const groups = new Map<string, RawJournalDoc[]>()
  for (const doc of docs) {
    const key = ownerDayKey(doc)
    const existing = groups.get(key)
    if (existing) existing.push(doc)
    else groups.set(key, [doc])
  }
  return groups
}

/**
 * Hard guard against ever merging across owners or dates. Called on every group
 * immediately before it is merged, so a grouping bug fails loudly instead of
 * silently combining two people's journals.
 */
export function assertSingleOwnerDay(docs: RawJournalDoc[]): void {
  if (docs.length === 0) throw new Error('assertSingleOwnerDay: empty group')
  const userIds = new Set(docs.map((d) => String(d.userId)))
  const dates = new Set(docs.map((d) => String(d.date)))
  if (userIds.size !== 1 || dates.size !== 1) {
    throw new Error(
      `assertSingleOwnerDay: refusing to merge across owners/dates ` +
        `(userIds=${[...userIds].join(',')} dates=${[...dates].join(',')})`
    )
  }
}

/**
 * Oldest first: createdAt ascending, documents without a usable createdAt last,
 * ties broken by _id string. Fully deterministic for a given input set.
 */
export function sortOldestFirst(docs: RawJournalDoc[]): RawJournalDoc[] {
  return [...docs].sort((a, b) => {
    const ta = timeOf(a.createdAt)
    const tb = timeOf(b.createdAt)
    if (ta !== tb) {
      if (ta === null) return 1
      if (tb === null) return -1
      return ta - tb
    }
    return idOf(a).localeCompare(idOf(b))
  })
}

/** Newest first: updatedAt desc, then createdAt desc, then _id desc. */
function sortNewestFirst(docs: RawJournalDoc[]): RawJournalDoc[] {
  return [...docs].sort((a, b) => {
    const ua = timeOf(a.updatedAt) ?? timeOf(a.createdAt)
    const ub = timeOf(b.updatedAt) ?? timeOf(b.createdAt)
    if (ua !== ub) {
      if (ua === null) return 1
      if (ub === null) return -1
      return ub - ua
    }
    return idOf(b).localeCompare(idOf(a))
  })
}

/**
 * The surviving document: the OLDEST of the group, so its `createdAt` (the day
 * the user first journalled) is the one kept.
 */
export function chooseSurvivor(docs: RawJournalDoc[]): RawJournalDoc {
  assertSingleOwnerDay(docs)
  return sortOldestFirst(docs)[0]
}

/** A field where more than one distinct meaningful value existed. */
export interface FieldConflict {
  field: MergedTextField | 'pagesRead'
  /** distinct meaningful values, newest first for text fields */
  values: (string | number)[]
  /** the value that won */
  chosen: string | number
}

export interface MergePlan {
  userId: string
  date: string
  /** _id of the document that is kept */
  survivorId: string
  /** _ids that will be deleted (never includes survivorId) */
  deleteIds: string[]
  /** fields to $set on the survivor; empty when the survivor already wins everything */
  set: Record<string, unknown>
  /** fields where duplicates disagreed on a meaningful value */
  conflicts: FieldConflict[]
}

/**
 * Merge one { userId, date } group into a single document.
 *
 * Rules:
 *  - free text: the NEWEST meaningful value wins (updatedAt desc). A blank or
 *    missing value can never overwrite a meaningful one.
 *  - pagesRead: the MAXIMUM across the group, so reading progress is never lost.
 *  - createdAt: the EARLIEST in the group.
 *  - updatedAt: the LATEST in the group.
 *  - every non-survivor is deleted; the group is asserted to share one owner
 *    and one date first.
 */
export function planGroupMerge(docs: RawJournalDoc[]): MergePlan {
  assertSingleOwnerDay(docs)

  const survivor = chooseSurvivor(docs)
  const newestFirst = sortNewestFirst(docs)
  const set: Record<string, unknown> = {}
  const conflicts: FieldConflict[] = []

  for (const field of MERGED_TEXT_FIELDS) {
    const meaningful = newestFirst.map((d) => d[field]).filter(isMeaningful)
    if (meaningful.length === 0) continue

    const winner = meaningful[0]
    const distinct = [...new Set(meaningful)]
    if (distinct.length > 1) conflicts.push({ field, values: distinct, chosen: winner })
    if (survivor[field] !== winner) set[field] = winner
  }

  const pageValues = docs
    .map((d) => d.pagesRead)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (pageValues.length > 0) {
    const maxPages = Math.max(...pageValues)
    const distinct = [...new Set(pageValues)]
    if (distinct.length > 1) conflicts.push({ field: 'pagesRead', values: distinct, chosen: maxPages })
    if (survivor.pagesRead !== maxPages) set.pagesRead = maxPages
  }

  // createdAt needs no merging: the survivor IS the earliest document in the
  // group by construction (see chooseSurvivor), so the original creation time
  // is preserved simply by keeping it.

  const updatedTimes = docs.map((d) => timeOf(d.updatedAt)).filter((t): t is number => t !== null)
  if (updatedTimes.length > 0) {
    const latest = new Date(Math.max(...updatedTimes))
    if (timeOf(survivor.updatedAt) !== latest.getTime()) set.updatedAt = latest
  }

  const survivorId = idOf(survivor)
  return {
    userId: String(survivor.userId),
    date: String(survivor.date),
    survivorId,
    deleteIds: docs.map(idOf).filter((id) => id !== survivorId),
    set,
    conflicts,
  }
}

/** Whole-collection plan: only groups with more than one document appear. */
export function planMigration(docs: RawJournalDoc[]): MergePlan[] {
  const plans: MergePlan[] = []
  for (const group of groupByOwnerDay(docs).values()) {
    if (group.length > 1) plans.push(planGroupMerge(group))
  }
  return plans
}

/** Minimal index description as returned by the driver's listIndexes(). */
export interface IndexInfo {
  name: string
  key: Record<string, unknown>
  unique?: boolean
}

/** True when `index` is exactly the { userId: 1, date: 1 } compound index. */
export function isOwnerDayIndex(index: IndexInfo): boolean {
  const keys = Object.keys(index.key)
  return keys.length === 2 && index.key.userId === 1 && index.key.date === 1
}

export type IndexAction =
  | { action: 'none'; reason: string }
  | { action: 'create'; reason: string }
  | { action: 'recreate'; dropName: string; reason: string }

/**
 * Decide what to do with the index, from the CURRENT index list. An existing
 * unique compound index is left alone (idempotent re-runs); a non-unique one is
 * dropped by its real name and recreated; a missing one is simply created.
 */
export function planIndexChange(indexes: IndexInfo[]): IndexAction {
  const existing = indexes.find(isOwnerDayIndex)
  if (!existing) return { action: 'create', reason: 'no { userId, date } index exists' }
  if (existing.unique === true)
    return { action: 'none', reason: `'${existing.name}' is already unique` }
  return {
    action: 'recreate',
    dropName: existing.name,
    reason: `'${existing.name}' exists but is not unique`,
  }
}

/** True when the collection's indexes satisfy the migration's end state. */
export function indexGoalMet(indexes: IndexInfo[]): boolean {
  const existing = indexes.find(isOwnerDayIndex)
  return Boolean(existing && existing.unique === true)
}

/**
 * Strip credentials out of anything that might be logged. Mongo driver errors
 * and connection failures can echo the full URI, which carries the password.
 */
export function redactMongoUri(text: string): string {
  return text
    .replace(/(mongodb(?:\+srv)?:\/\/)[^@\s/]*@/gi, '$1<redacted>@')
    .replace(/(password|pwd|authSource|secret)=([^&\s]+)/gi, '$1=<redacted>')
}
