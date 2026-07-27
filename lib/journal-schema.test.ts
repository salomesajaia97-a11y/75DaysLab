// Schema-level guarantees for the extended JournalEntry model. Uses
// validateSync() + index introspection only — NO database connection, matching
// the style of schema-timezone.test.ts.

import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { JournalEntry } from '@/models/JournalEntry'
import { JOURNAL_FIELD_LIMITS, JOURNAL_MOODS } from '@/lib/journal'
import { computeDailyFlags, JOURNAL_MIN_PAGES } from '@/lib/daily-log'

/** A single [fields, options] entry as returned by Schema.indexes(). */
type IndexEntry = [Record<string, unknown>, Record<string, unknown> | undefined]

const newEntry = (over: Record<string, unknown> = {}) =>
  new JournalEntry({ userId: new mongoose.Types.ObjectId(), date: '2026-07-27', ...over })

describe('one entry per user per local date', () => {
  it('declares a UNIQUE compound index on { userId, date }', () => {
    const indexes = JournalEntry.schema.indexes() as IndexEntry[]
    const match = indexes.find(
      ([fields]) => fields.userId === 1 && fields.date === 1 && Object.keys(fields).length === 2
    )
    expect(match, 'a { userId: 1, date: 1 } index must exist').toBeDefined()
    expect(match?.[1]?.unique).toBe(true)
  })

  it('has no competing non-unique { userId, date } index', () => {
    const indexes = JournalEntry.schema.indexes() as IndexEntry[]
    const duplicates = indexes.filter(
      ([fields, opts]) =>
        fields.userId === 1 && fields.date === 1 && Object.keys(fields).length === 2 && !opts?.unique
    )
    expect(duplicates).toHaveLength(0)
  })
})

describe('reflection fields', () => {
  it('accepts a reflection-only day (no reading logged)', () => {
    const entry = newEntry({ mood: 'good', reflection: 'Solid day.' })
    expect(entry.validateSync()).toBeUndefined()
    expect(entry.pagesRead).toBeUndefined()
  })

  it('stores only canonical mood keys', () => {
    for (const mood of JOURNAL_MOODS) {
      expect(newEntry({ mood }).validateSync()?.errors.mood, mood).toBeUndefined()
    }
    for (const bad of ['Great', 'happy', 'ძალიან კარგად']) {
      expect(newEntry({ mood: bad }).validateSync()?.errors.mood, bad).toBeDefined()
    }
  })

  it('enforces the same maximum lengths the API enforces', () => {
    for (const [field, limit] of Object.entries(JOURNAL_FIELD_LIMITS)) {
      expect(newEntry({ [field]: 'a'.repeat(limit) }).validateSync()?.errors[field]).toBeUndefined()
      expect(newEntry({ [field]: 'a'.repeat(limit + 1) }).validateSync()?.errors[field], field).toBeDefined()
    }
  })

  it('defaults every reflection text field to an empty string', () => {
    const entry = newEntry()
    expect(entry.title).toBe('')
    expect(entry.reflection).toBe('')
    expect(entry.gratitude).toBe('')
    expect(entry.tomorrowFocus).toBe('')
    expect(entry.mood).toBeUndefined()
  })
})

describe('the reading log (challenge task) is unchanged', () => {
  it('still stores bookTitle / pagesRead / notes', () => {
    const entry = newEntry({ bookTitle: 'Deep Work', pagesRead: 24, notes: 'ch. 2' })
    expect(entry.validateSync()).toBeUndefined()
    expect(entry.bookTitle).toBe('Deep Work')
    expect(entry.pagesRead).toBe(24)
  })

  it('still rejects a negative page count', () => {
    expect(newEntry({ pagesRead: -1 }).validateSync()?.errors.pagesRead).toBeDefined()
  })

  it('a reflection-only day does NOT complete the journal task', () => {
    const base = {
      waterMl: 0,
      waterGoalMl: 2500,
      foodLogCount: 0,
      photoExists: false,
      structuredWorkoutCompleted: false,
      outdoorWorkoutCompleted: false,
    }
    // pagesRead is undefined on a reflection-only row → the spine reads null.
    expect(computeDailyFlags({ ...base, journalPagesRead: null }).journalCompleted).toBe(false)
    expect(computeDailyFlags({ ...base, journalPagesRead: 0 }).journalCompleted).toBe(false)
    expect(
      computeDailyFlags({ ...base, journalPagesRead: JOURNAL_MIN_PAGES }).journalCompleted
    ).toBe(true)
  })
})
