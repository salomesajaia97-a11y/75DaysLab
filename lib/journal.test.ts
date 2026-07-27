// Pure domain tests for the daily reflection contract: mood scale, field
// limits, trimming, the "empty entry" rule, previews and the history clamp.
// No DB, no React — lib/journal.ts is intentionally dependency-free.

import { describe, it, expect } from 'vitest'
import {
  EMPTY_REFLECTION,
  JOURNAL_FIELD_LIMITS,
  JOURNAL_MOODS,
  clampHistoryDays,
  isJournalMood,
  isReflectionEmpty,
  normalizeReflection,
  reflectionPreview,
  reflectionsEqual,
  toReflectionDraft,
} from './journal'

describe('mood scale', () => {
  it('is the fixed five-point scale, ordered low → high', () => {
    expect(JOURNAL_MOODS).toEqual(['very_low', 'low', 'neutral', 'good', 'great'])
  })

  it('accepts only canonical keys — never a localized label', () => {
    for (const mood of JOURNAL_MOODS) expect(isJournalMood(mood)).toBe(true)
    for (const bad of ['Great', 'ძალიან კარგად', 'happy', '', null, 3]) {
      expect(isJournalMood(bad)).toBe(false)
    }
  })
})

describe('normalizeReflection — accepted input', () => {
  it('trims every text field and keeps the mood', () => {
    const res = normalizeReflection({
      mood: 'good',
      title: '  Solid day  ',
      reflection: '\n Trained early. \n',
      gratitude: ' coffee ',
      tomorrowFocus: ' sleep 8h ',
    })
    expect(res).toEqual({
      ok: true,
      value: {
        mood: 'good',
        title: 'Solid day',
        reflection: 'Trained early.',
        gratitude: 'coffee',
        tomorrowFocus: 'sleep 8h',
      },
    })
  })

  it('accepts a mood with no text at all', () => {
    const res = normalizeReflection({ mood: 'low' })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.value).toEqual({ ...EMPTY_REFLECTION, mood: 'low' })
  })

  it('accepts text with no mood', () => {
    const res = normalizeReflection({ reflection: 'Long day.' })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.value.mood).toBeNull()
  })

  it('treats null/empty-string mood as "no mood" rather than an error', () => {
    for (const mood of [null, '', undefined]) {
      const res = normalizeReflection({ mood, reflection: 'x' })
      expect(res.ok).toBe(true)
      if (res.ok) expect(res.value.mood).toBeNull()
    }
  })

  it('ignores unknown extra properties (e.g. a spoofed userId)', () => {
    const res = normalizeReflection({ reflection: 'x', userId: 'someone-else', _id: 'abc' })
    expect(res.ok).toBe(true)
    if (res.ok) expect(Object.keys(res.value).sort()).toEqual([
      'gratitude',
      'mood',
      'reflection',
      'title',
      'tomorrowFocus',
    ])
  })
})

describe('normalizeReflection — rejected input', () => {
  it('rejects a non-object payload', () => {
    for (const bad of [null, 'text', 42, ['a']]) {
      expect(normalizeReflection(bad)).toEqual({ ok: false, code: 'invalid_payload' })
    }
  })

  it('rejects an unknown mood', () => {
    expect(normalizeReflection({ mood: 'ecstatic' })).toEqual({ ok: false, code: 'invalid_mood' })
  })

  it('rejects a non-string text field and names it', () => {
    expect(normalizeReflection({ reflection: 42 })).toEqual({
      ok: false,
      code: 'invalid_text',
      field: 'reflection',
    })
  })

  it('rejects an entry with no mood and no text (the empty contract)', () => {
    expect(normalizeReflection({})).toEqual({ ok: false, code: 'empty' })
    expect(normalizeReflection({ title: '   ', reflection: '\n\t ' })).toEqual({
      ok: false,
      code: 'empty',
    })
  })

  it('enforces every per-field maximum length', () => {
    for (const [field, limit] of Object.entries(JOURNAL_FIELD_LIMITS)) {
      expect(normalizeReflection({ [field]: 'a'.repeat(limit) }).ok, `${field} at limit`).toBe(true)
      expect(normalizeReflection({ [field]: 'a'.repeat(limit + 1) })).toEqual({
        ok: false,
        code: 'too_long',
        field,
      })
    }
  })

  it('measures length AFTER trimming, so padding never trips the limit', () => {
    const padded = `  ${'a'.repeat(JOURNAL_FIELD_LIMITS.title)}  `
    expect(normalizeReflection({ title: padded }).ok).toBe(true)
  })
})

describe('isReflectionEmpty / reflectionsEqual', () => {
  it('treats whitespace-only text as empty', () => {
    expect(isReflectionEmpty(EMPTY_REFLECTION)).toBe(true)
    expect(isReflectionEmpty({ ...EMPTY_REFLECTION, reflection: '   ' })).toBe(true)
    expect(isReflectionEmpty({ ...EMPTY_REFLECTION, mood: 'neutral' })).toBe(false)
    expect(isReflectionEmpty({ ...EMPTY_REFLECTION, gratitude: 'x' })).toBe(false)
  })

  it('compares every field for the dirty check', () => {
    const a = { ...EMPTY_REFLECTION, mood: 'good' as const, reflection: 'x' }
    expect(reflectionsEqual(a, { ...a })).toBe(true)
    expect(reflectionsEqual(a, { ...a, mood: null })).toBe(false)
    expect(reflectionsEqual(a, { ...a, tomorrowFocus: 'y' })).toBe(false)
  })
})

describe('toReflectionDraft', () => {
  it('degrades unknown/legacy stored shapes to empty values instead of throwing', () => {
    expect(toReflectionDraft(null)).toEqual(EMPTY_REFLECTION)
    expect(toReflectionDraft({ bookTitle: 'Deep Work', pagesRead: 12 })).toEqual(EMPTY_REFLECTION)
    expect(toReflectionDraft({ mood: 'nonsense', title: 5 })).toEqual(EMPTY_REFLECTION)
  })

  it('reads the reflection half of a stored entry', () => {
    expect(toReflectionDraft({ mood: 'great', reflection: 'Good day', pagesRead: 30 })).toEqual({
      ...EMPTY_REFLECTION,
      mood: 'great',
      reflection: 'Good day',
    })
  })
})

describe('reflectionPreview', () => {
  it('collapses whitespace and leaves short text intact', () => {
    expect(reflectionPreview('Trained   early.\nAte well.')).toBe('Trained early. Ate well.')
  })

  it('truncates with an ellipsis at the requested length', () => {
    const out = reflectionPreview('a'.repeat(200), 20)
    expect(out).toHaveLength(20)
    expect(out.endsWith('…')).toBe(true)
  })
})

describe('clampHistoryDays', () => {
  it('defaults to 30 and clamps into [1, 180]', () => {
    expect(clampHistoryDays(null)).toBe(30)
    expect(clampHistoryDays('abc')).toBe(30)
    expect(clampHistoryDays('7')).toBe(7)
    expect(clampHistoryDays('0')).toBe(1)
    expect(clampHistoryDays('-5')).toBe(1)
    expect(clampHistoryDays('9999')).toBe(180)
  })
})
