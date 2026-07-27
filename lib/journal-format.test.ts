// Journal date presentation. Georgian must never fall back to English: many
// browser/Node builds ship without `ka` ICU data, and Intl then silently
// formats as en-US. These tests pin the explicit-table output so a Georgian UI
// can never render an English date.

import { describe, it, expect } from 'vitest'
import {
  formatJournalDate,
  formatMonthLabel,
  formatShortJournalDate,
  monthKey,
} from './journal-format'

const MONDAY = '2026-07-27'

describe('English formatting', () => {
  it('renders the full day, day-before-month', () => {
    expect(formatJournalDate(MONDAY, 'en')).toBe('Monday, 27 July 2026')
  })

  it('renders a compact history label and a month heading', () => {
    expect(formatShortJournalDate(MONDAY, 'en')).toBe('Mon 27 Jul')
    expect(formatMonthLabel('2026-07-01', 'en')).toBe('July 2026')
  })
})

describe('Georgian formatting', () => {
  it('renders the full day in Georgian', () => {
    expect(formatJournalDate(MONDAY, 'ge')).toBe('ორშაბათი, 27 ივლისი, 2026')
  })

  it('renders a compact history label and a month heading in Georgian', () => {
    expect(formatShortJournalDate(MONDAY, 'ge')).toBe('ორშ, 27 ივლ')
    expect(formatMonthLabel('2026-07-01', 'ge')).toBe('ივლისი 2026')
  })

  it('never emits Latin letters, whatever ICU data the runtime has', () => {
    for (let day = 1; day <= 28; day++) {
      const date = `2026-02-${String(day).padStart(2, '0')}`
      expect(formatJournalDate(date, 'ge')).not.toMatch(/[A-Za-z]/)
      expect(formatShortJournalDate(date, 'ge')).not.toMatch(/[A-Za-z]/)
    }
    for (let month = 1; month <= 12; month++) {
      const date = `2026-${String(month).padStart(2, '0')}-15`
      expect(formatMonthLabel(date, 'ge'), date).not.toMatch(/[A-Za-z]/)
      expect(formatJournalDate(date, 'ge'), date).not.toMatch(/[A-Za-z]/)
    }
  })

  it('maps every weekday correctly across a full week', () => {
    // 2026-07-19 is a Sunday, so 19–25 covers a whole week.
    const expected = [
      'კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი',
    ]
    expected.forEach((weekday, i) => {
      const date = `2026-07-${19 + i}`
      expect(formatJournalDate(date, 'ge').startsWith(`${weekday},`), date).toBe(true)
    })
  })
})

describe('robustness', () => {
  it('reads the key in UTC, so the label never shifts with the machine zone', () => {
    expect(formatJournalDate('2026-01-01', 'en')).toBe('Thursday, 1 January 2026')
    expect(formatJournalDate('2026-12-31', 'en')).toBe('Thursday, 31 December 2026')
    expect(formatJournalDate('2026-01-01', 'ge')).toBe('ხუთშაბათი, 1 იანვარი, 2026')
  })

  it('passes an invalid key through untouched instead of throwing', () => {
    for (const bad of ['not-a-date', '2026-02-31', '', '2026-13-01']) {
      expect(formatJournalDate(bad, 'en')).toBe(bad)
      expect(formatShortJournalDate(bad, 'ge')).toBe(bad)
      expect(formatMonthLabel(bad, 'en')).toBe(bad)
    }
  })

  it('derives the month grouping key', () => {
    expect(monthKey('2026-07-27')).toBe('2026-07')
  })
})
