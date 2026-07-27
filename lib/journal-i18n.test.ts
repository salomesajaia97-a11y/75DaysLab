// Translation coverage for the Journal feature. Guards against a component
// shipping a key that only exists in English (the provider silently falls back
// to en, so a missing Georgian string is invisible at runtime).

import { describe, it, expect } from 'vitest'
import en from '@/locales/en.json'
import ge from '@/locales/ge.json'
import { JOURNAL_MOODS } from './journal'

const LOCALES: Record<string, Record<string, string>> = { en, ge }

/** Every key the Journal UI resolves, including the dynamically built ones. */
const REQUIRED_KEYS = [
  'journal.title',
  'journal.subtitle',
  'journal.card_title',
  'journal.day.today',
  'journal.day.prev',
  'journal.day.next',
  'journal.day.jump_today',
  'journal.mood.label',
  ...JOURNAL_MOODS.map((m) => `journal.mood.${m}`),
  // JournalDayHeader renders `journal.status.<JournalDayStatus>`
  ...['loading', 'empty', 'saved', 'unsaved', 'saving', 'error'].map((s) => `journal.status.${s}`),
  'journal.status.save_success',
  'journal.status.load_failed',
  'journal.field.title',
  'journal.field.title_placeholder',
  'journal.field.reflection',
  'journal.field.reflection_placeholder',
  'journal.field.gratitude',
  'journal.field.gratitude_placeholder',
  'journal.field.tomorrow',
  'journal.field.tomorrow_placeholder',
  'journal.field.chars_left',
  'journal.action.save',
  'journal.action.saving',
  'journal.action.retry',
  'journal.action.save_hint_empty',
  'journal.action.save_hint_dirty',
  'journal.action.save_hint_clean',
  'journal.unsaved.restored',
  // JournalExperience renders `journal.error.<code>` from the API response
  ...[
    'invalid_payload',
    'invalid_mood',
    'invalid_text',
    'too_long',
    'empty',
    'invalid_date',
    'future_date',
    'save_failed',
    'read_failed',
    'network',
  ].map((c) => `journal.error.${c}`),
  'journal.history.title',
  'journal.history.loading',
  'journal.history.failed',
  'journal.history.retry',
  'journal.history.empty_title',
  'journal.history.empty_hint',
  'journal.history.no_text',
]

/** `{name}` placeholders used by the provider's interpolate(). */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
}

describe.each(Object.keys(LOCALES))('locales/%s.json', (locale) => {
  const dict = LOCALES[locale]

  it('defines every Journal key with a non-empty string', () => {
    const missing = REQUIRED_KEYS.filter((k) => typeof dict[k] !== 'string' || !dict[k].trim())
    expect(missing).toEqual([])
  })

  it('never leaves an untranslated copy of the English string in Georgian', () => {
    if (locale === 'en') return
    // Georgian uses a distinct script, so a Journal string identical to English
    // means the key was copied rather than translated. Short shared tokens are
    // allowed to coincide only if they contain no Latin letters.
    const copied = REQUIRED_KEYS.filter((k) => dict[k] === en[k as keyof typeof en] && /[A-Za-z]/.test(dict[k]))
    expect(copied).toEqual([])
  })
})

describe('interpolation parity', () => {
  it('uses the same {placeholders} in both locales', () => {
    for (const key of REQUIRED_KEYS) {
      expect(placeholders(ge[key as keyof typeof ge] ?? ''), key).toEqual(
        placeholders(en[key as keyof typeof en] ?? '')
      )
    }
  })
})

describe('mood labels are display-only', () => {
  it('are localized in both locales and never equal the stored key', () => {
    for (const mood of JOURNAL_MOODS) {
      const key = `journal.mood.${mood}`
      expect(en[key as keyof typeof en]).not.toBe(mood)
      expect(ge[key as keyof typeof ge]).not.toBe(mood)
    }
  })
})
