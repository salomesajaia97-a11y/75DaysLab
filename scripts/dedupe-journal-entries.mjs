// One-off migration for the journal unique index.
//
// JournalEntry used to carry a NON-unique { userId, date } index, so a legacy
// collection may already hold two rows for the same user-day. The unique index
// declared by models/JournalEntry.ts cannot build while those exist.
//
// This script merges each duplicate group into the OLDEST document (field by
// field, preferring the first non-empty value, and the largest pagesRead so no
// reading progress is lost), deletes the extras, then creates the unique index.
//
// Usage:
//   node scripts/dedupe-journal-entries.mjs           # report only
//   node scripts/dedupe-journal-entries.mjs --apply   # merge + create index
import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => l.split('=').map((v, i) => i === 0 ? v.trim() : l.slice(l.indexOf('=') + 1).trim()))
)

const apply = process.argv.includes('--apply')
const TEXT_FIELDS = ['bookTitle', 'notes', 'mood', 'title', 'reflection', 'gratitude', 'tomorrowFocus']

const client = new MongoClient(env.MONGODB_URI)
await client.connect()
const entries = client.db().collection('journalentries')

const groups = await entries
  .aggregate([
    { $group: { _id: { userId: '$userId', date: '$date' }, ids: { $push: '$_id' }, n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
  ])
  .toArray()

console.log(`Duplicate user-days found: ${groups.length}`)

for (const group of groups) {
  const docs = await entries.find({ _id: { $in: group.ids } }).sort({ createdAt: 1, _id: 1 }).toArray()
  const [keep, ...extras] = docs

  const merged = {}
  for (const field of TEXT_FIELDS) {
    const winner = docs.map(d => d[field]).find(v => typeof v === 'string' && v.trim())
    if (winner !== undefined && winner !== keep[field]) merged[field] = winner
  }
  const maxPages = Math.max(...docs.map(d => (typeof d.pagesRead === 'number' ? d.pagesRead : -1)))
  if (maxPages >= 0 && maxPages !== keep.pagesRead) merged.pagesRead = maxPages

  console.log(
    `${group._id.userId} ${group._id.date}: keep ${keep._id}, drop ${extras.length}` +
      (Object.keys(merged).length ? ` (merging ${Object.keys(merged).join(', ')})` : '')
  )

  if (!apply) continue
  if (Object.keys(merged).length) await entries.updateOne({ _id: keep._id }, { $set: merged })
  await entries.deleteMany({ _id: { $in: extras.map(d => d._id) } })
}

if (apply) {
  await entries.dropIndex('userId_1_date_1').catch(() => {})
  await entries.createIndex({ userId: 1, date: 1 }, { unique: true })
  console.log('✓ Unique { userId, date } index created')
} else {
  console.log('\nDry run — re-run with --apply to merge duplicates and create the unique index.')
}

await client.close()
