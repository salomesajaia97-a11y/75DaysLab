// Pure merge/grouping/index logic behind scripts/dedupe-journal-entries.mts.
// The migration deletes production rows and rebuilds an index, so every rule it
// relies on is pinned here — above all, that two users who journalled the SAME
// date are never merged into one another.

import { describe, it, expect } from 'vitest'
import {
  JOURNAL_INDEX_KEY,
  JOURNAL_INDEX_NAME,
  assertSingleOwnerDay,
  chooseSurvivor,
  groupByOwnerDay,
  indexGoalMet,
  isOwnerDayIndex,
  ownerDayKey,
  planGroupMerge,
  planIndexChange,
  planMigration,
  redactMongoUri,
  type IndexInfo,
  type RawJournalDoc,
} from './journal-migration'

const USER_A = 'aaaaaaaaaaaaaaaaaaaaaaaa'
const USER_B = 'bbbbbbbbbbbbbbbbbbbbbbbb'
const DATE = '2026-07-27'

let seq = 0
function doc(over: Partial<RawJournalDoc> = {}): RawJournalDoc {
  seq += 1
  return {
    _id: over._id ?? `id${String(seq).padStart(3, '0')}`,
    userId: USER_A,
    date: DATE,
    createdAt: new Date('2026-07-27T10:00:00Z'),
    updatedAt: new Date('2026-07-27T10:00:00Z'),
    ...over,
  }
}

describe('grouping is by userId AND date', () => {
  it('keys on both fields', () => {
    expect(ownerDayKey(doc())).toBe(`${USER_A}|${DATE}`)
    expect(ownerDayKey(doc({ userId: USER_B }))).not.toBe(ownerDayKey(doc()))
  })

  it('never puts two different users in the same group, even on the same date', () => {
    const groups = groupByOwnerDay([
      doc({ userId: USER_A }),
      doc({ userId: USER_B }),
      doc({ userId: USER_A }),
    ])
    expect(groups.size).toBe(2)
    expect(groups.get(`${USER_A}|${DATE}`)).toHaveLength(2)
    expect(groups.get(`${USER_B}|${DATE}`)).toHaveLength(1)
  })

  it('never puts two different dates in the same group', () => {
    const groups = groupByOwnerDay([doc(), doc({ date: '2026-07-26' })])
    expect(groups.size).toBe(2)
  })

  it('refuses outright to merge a group that spans owners or dates', () => {
    expect(() => assertSingleOwnerDay([doc({ userId: USER_A }), doc({ userId: USER_B })])).toThrow(
      /refusing to merge across owners\/dates/
    )
    expect(() => assertSingleOwnerDay([doc({ date: '2026-07-26' }), doc()])).toThrow(
      /refusing to merge across owners\/dates/
    )
    expect(() => assertSingleOwnerDay([])).toThrow(/empty group/)
  })
})

describe('planMigration — which groups need work', () => {
  it('returns nothing when there are no duplicates', () => {
    expect(planMigration([])).toEqual([])
    expect(planMigration([doc(), doc({ date: '2026-07-26' }), doc({ userId: USER_B })])).toEqual([])
  })

  it('picks up only the duplicated user-days', () => {
    const plans = planMigration([
      doc({ _id: 'a1' }),
      doc({ _id: 'a2' }),
      doc({ _id: 'b1', userId: USER_B }),
    ])
    expect(plans).toHaveLength(1)
    expect(plans[0].userId).toBe(USER_A)
    expect(plans[0].deleteIds).toEqual(['a2'])
  })

  it('two users with the same date are each left alone', () => {
    const plans = planMigration([doc({ userId: USER_A }), doc({ userId: USER_B })])
    expect(plans).toEqual([])
  })

  it('handles both users having their own duplicates without cross-contamination', () => {
    const plans = planMigration([
      doc({ _id: 'a1', userId: USER_A, reflection: 'A one' }),
      doc({ _id: 'a2', userId: USER_A, reflection: 'A two', updatedAt: new Date('2026-07-27T12:00:00Z') }),
      doc({ _id: 'b1', userId: USER_B, reflection: 'B one' }),
      doc({ _id: 'b2', userId: USER_B, reflection: 'B two', updatedAt: new Date('2026-07-27T12:00:00Z') }),
    ])
    expect(plans).toHaveLength(2)
    const byUser = Object.fromEntries(plans.map((p) => [p.userId, p]))
    expect(byUser[USER_A].set.reflection).toBe('A two')
    expect(byUser[USER_B].set.reflection).toBe('B two')
    expect(byUser[USER_A].deleteIds).toEqual(['a2'])
    expect(byUser[USER_B].deleteIds).toEqual(['b2'])
  })
})

describe('survivor selection is deterministic', () => {
  it('keeps the oldest document by createdAt', () => {
    const older = doc({ _id: 'old', createdAt: new Date('2026-07-27T08:00:00Z') })
    const newer = doc({ _id: 'new', createdAt: new Date('2026-07-27T20:00:00Z') })
    expect(chooseSurvivor([newer, older])._id).toBe('old')
    expect(chooseSurvivor([older, newer])._id).toBe('old')
  })

  it('breaks createdAt ties on _id, independent of input order', () => {
    const a = doc({ _id: 'aaa' })
    const b = doc({ _id: 'zzz' })
    expect(chooseSurvivor([b, a])._id).toBe('aaa')
    expect(chooseSurvivor([a, b])._id).toBe('aaa')
  })

  it('sorts a document with no createdAt last, so a dated one survives', () => {
    const undated = doc({ _id: 'undated', createdAt: undefined })
    const dated = doc({ _id: 'dated' })
    expect(chooseSurvivor([undated, dated])._id).toBe('dated')
  })
})

describe('merging free text — newest meaningful value wins', () => {
  it('takes the reflection from the most recently updated duplicate', () => {
    const plan = planGroupMerge([
      doc({ _id: 'old', reflection: 'stale', createdAt: new Date('2026-07-27T08:00:00Z'), updatedAt: new Date('2026-07-27T09:00:00Z') }),
      doc({ _id: 'new', reflection: 'fresh', createdAt: new Date('2026-07-27T12:00:00Z'), updatedAt: new Date('2026-07-27T18:00:00Z') }),
    ])
    expect(plan.survivorId).toBe('old')
    expect(plan.set.reflection).toBe('fresh')
  })

  it('never lets a blank or missing value overwrite meaningful data', () => {
    const plan = planGroupMerge([
      doc({ _id: 'old', reflection: 'keep me', title: 'Title', createdAt: new Date('2026-07-27T08:00:00Z'), updatedAt: new Date('2026-07-27T09:00:00Z') }),
      doc({ _id: 'new', reflection: '', title: '   ', createdAt: new Date('2026-07-27T12:00:00Z'), updatedAt: new Date('2026-07-27T18:00:00Z') }),
    ])
    // 'old' is the survivor and already holds both values, so nothing to write.
    expect(plan.survivorId).toBe('old')
    expect(plan.set).not.toHaveProperty('reflection')
    expect(plan.set).not.toHaveProperty('title')
    expect(plan.conflicts).toEqual([])
  })

  it('promotes a meaningful value from a newer duplicate onto a blank survivor', () => {
    const plan = planGroupMerge([
      doc({ _id: 'old', reflection: '', createdAt: new Date('2026-07-27T08:00:00Z'), updatedAt: new Date('2026-07-27T08:00:00Z') }),
      doc({ _id: 'new', reflection: 'the real one', createdAt: new Date('2026-07-27T12:00:00Z'), updatedAt: new Date('2026-07-27T18:00:00Z') }),
    ])
    expect(plan.survivorId).toBe('old')
    expect(plan.set.reflection).toBe('the real one')
  })

  it('reports conflicting reflection values and records which one was kept', () => {
    const plan = planGroupMerge([
      doc({ _id: 'old', reflection: 'first take', createdAt: new Date('2026-07-27T08:00:00Z'), updatedAt: new Date('2026-07-27T09:00:00Z') }),
      doc({ _id: 'new', reflection: 'second take', createdAt: new Date('2026-07-27T12:00:00Z'), updatedAt: new Date('2026-07-27T18:00:00Z') }),
    ])
    expect(plan.conflicts).toEqual([
      { field: 'reflection', values: ['second take', 'first take'], chosen: 'second take' },
    ])
  })

  it('merges reading data from one duplicate with reflection data from another', () => {
    const plan = planGroupMerge([
      doc({ _id: 'reading', bookTitle: 'Deep Work', pagesRead: 24, notes: 'ch2', createdAt: new Date('2026-07-27T08:00:00Z'), updatedAt: new Date('2026-07-27T09:00:00Z') }),
      doc({ _id: 'reflect', mood: 'good', reflection: 'Solid day', createdAt: new Date('2026-07-27T12:00:00Z'), updatedAt: new Date('2026-07-27T18:00:00Z') }),
    ])
    expect(plan.survivorId).toBe('reading')
    expect(plan.set).toMatchObject({ mood: 'good', reflection: 'Solid day' })
    expect(plan.set).not.toHaveProperty('bookTitle') // survivor already has it
    expect(plan.set).not.toHaveProperty('pagesRead')
    expect(plan.deleteIds).toEqual(['reflect'])
  })

  it('carries reading data forward when the reflection row is the survivor', () => {
    const plan = planGroupMerge([
      doc({ _id: 'reflect', mood: 'good', createdAt: new Date('2026-07-27T08:00:00Z'), updatedAt: new Date('2026-07-27T08:00:00Z') }),
      doc({ _id: 'reading', bookTitle: 'Deep Work', pagesRead: 24, notes: 'ch2', createdAt: new Date('2026-07-27T12:00:00Z'), updatedAt: new Date('2026-07-27T18:00:00Z') }),
    ])
    expect(plan.survivorId).toBe('reflect')
    expect(plan.set).toMatchObject({ bookTitle: 'Deep Work', pagesRead: 24, notes: 'ch2' })
  })
})

describe('merging pagesRead — reading progress is never lost', () => {
  it('keeps the maximum and flags the conflict', () => {
    const plan = planGroupMerge([
      doc({ _id: 'survivor', pagesRead: 12, createdAt: new Date('2026-07-27T08:00:00Z'), updatedAt: new Date('2026-07-27T18:00:00Z') }),
      doc({ _id: 'later', pagesRead: 40, createdAt: new Date('2026-07-27T12:00:00Z'), updatedAt: new Date('2026-07-27T09:00:00Z') }),
    ])
    // The survivor logged fewer pages, so the higher count must be written onto
    // it — a merge must never lose reading progress.
    expect(plan.survivorId).toBe('survivor')
    expect(plan.set.pagesRead).toBe(40)
    expect(plan.conflicts).toContainEqual({ field: 'pagesRead', values: [12, 40], chosen: 40 })
  })

  it('ignores a missing pagesRead rather than treating it as zero', () => {
    const plan = planGroupMerge([
      doc({ _id: 'a', pagesRead: undefined, createdAt: new Date('2026-07-27T08:00:00Z') }),
      doc({ _id: 'b', pagesRead: 30, createdAt: new Date('2026-07-27T12:00:00Z') }),
    ])
    expect(plan.set.pagesRead).toBe(30)
    expect(plan.conflicts).toEqual([])
  })

  it('writes nothing when no duplicate recorded any pages', () => {
    const plan = planGroupMerge([doc({ _id: 'a', pagesRead: undefined }), doc({ _id: 'b', pagesRead: undefined })])
    expect(plan.set).not.toHaveProperty('pagesRead')
  })
})

describe('timestamps', () => {
  it('adopts the latest updatedAt from the group', () => {
    const plan = planGroupMerge([
      doc({ _id: 'survivor', createdAt: new Date('2026-07-27T07:00:00Z'), updatedAt: new Date('2026-07-27T09:00:00Z') }),
      doc({ _id: 'later', createdAt: new Date('2026-07-27T08:00:00Z'), updatedAt: new Date('2026-07-27T18:00:00Z') }),
    ])
    expect(plan.survivorId).toBe('survivor')
    expect(plan.set.updatedAt).toEqual(new Date('2026-07-27T18:00:00Z'))
  })

  it('preserves createdAt by construction — the survivor is already the earliest', () => {
    const plan = planGroupMerge([
      doc({ _id: 'later', createdAt: new Date('2026-07-27T12:00:00Z') }),
      doc({ _id: 'earliest', createdAt: new Date('2026-07-27T06:00:00Z') }),
    ])
    expect(plan.survivorId).toBe('earliest')
    // Never rewritten: keeping the oldest row IS the createdAt guarantee.
    expect(plan.set).not.toHaveProperty('createdAt')
  })
})

describe('the survivor is never in its own delete list', () => {
  it('holds for any group size', () => {
    const plan = planGroupMerge([doc({ _id: 'x' }), doc({ _id: 'y' }), doc({ _id: 'z' })])
    expect(plan.deleteIds).not.toContain(plan.survivorId)
    expect(plan.deleteIds).toHaveLength(2)
  })
})

describe('index planning', () => {
  const idIndex: IndexInfo = { name: '_id_', key: { _id: 1 } }
  const nonUnique: IndexInfo = { name: JOURNAL_INDEX_NAME, key: { userId: 1, date: 1 } }
  const unique: IndexInfo = { name: JOURNAL_INDEX_NAME, key: { userId: 1, date: 1 }, unique: true }

  it('targets exactly { userId: 1, date: 1 }', () => {
    expect(JOURNAL_INDEX_KEY).toEqual({ userId: 1, date: 1 })
    expect(isOwnerDayIndex(nonUnique)).toBe(true)
    expect(isOwnerDayIndex(idIndex)).toBe(false)
    // a date-only index is NOT the target — uniqueness must be per user
    expect(isOwnerDayIndex({ name: 'date_1', key: { date: 1 } })).toBe(false)
    expect(isOwnerDayIndex({ name: 'three', key: { userId: 1, date: 1, mood: 1 } })).toBe(false)
  })

  it('recreates a non-unique index, dropping it by its REAL name', () => {
    const plan = planIndexChange([idIndex, { ...nonUnique, name: 'legacy_name' }])
    expect(plan).toMatchObject({ action: 'recreate', dropName: 'legacy_name' })
  })

  it('creates the index when none exists', () => {
    expect(planIndexChange([idIndex]).action).toBe('create')
  })

  it('is idempotent — an already-unique index is left alone', () => {
    expect(planIndexChange([idIndex, unique]).action).toBe('none')
  })

  it('the goal is met only by a UNIQUE compound index', () => {
    expect(indexGoalMet([idIndex, unique])).toBe(true)
    expect(indexGoalMet([idIndex, nonUnique])).toBe(false)
    expect(indexGoalMet([idIndex])).toBe(false)
    expect(indexGoalMet([idIndex, { name: 'date_1', key: { date: 1 }, unique: true }])).toBe(false)
  })
})

describe('credentials never reach the logs', () => {
  it('redacts the password out of any connection string', () => {
    const err =
      'MongoServerError: auth failed for mongodb+srv://admin:sup3rS3cret@cluster0.abc.mongodb.net/75dayslab'
    const safe = redactMongoUri(err)
    expect(safe).not.toContain('sup3rS3cret')
    expect(safe).not.toContain('admin:')
    expect(safe).toContain('<redacted>@')
  })

  it('redacts password-style query parameters', () => {
    expect(redactMongoUri('...?password=hunter2&retryWrites=true')).toContain('password=<redacted>')
  })

  it('leaves ordinary text untouched', () => {
    expect(redactMongoUri('deleted 3 duplicates')).toBe('deleted 3 duplicates')
  })
})
