// Presentation-only date formatting for the journal UI.
//
// These helpers NEVER derive a day key — they only render an existing canonical
// 'YYYY-MM-DD' key for humans. The key is parsed as UTC midnight and formatted
// with `timeZone: 'UTC'`, so the displayed date always matches the stored key
// regardless of the machine's local zone.

import type { Locale } from '@/lib/i18n'
import { isValidCivilDate } from '@/lib/date-key'

/** BCP-47 tag for each supported app locale. */
export function intlLocale(locale: Locale): string {
  return locale === 'ge' ? 'ka-GE' : 'en-GB'
}

function asUtcDate(date: string): Date | null {
  if (!isValidCivilDate(date)) return null
  return new Date(`${date}T00:00:00.000Z`)
}

function format(date: string, locale: Locale, options: Intl.DateTimeFormatOptions): string {
  const d = asUtcDate(date)
  if (!d) return date
  try {
    return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: 'UTC', ...options }).format(d)
  } catch {
    return date
  }
}

/** Full day label for the selected-day header, e.g. "Monday, 27 July 2026". */
export function formatJournalDate(date: string, locale: Locale): string {
  return format(date, locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/** Compact label for history rows, e.g. "Mon 27 Jul". */
export function formatShortJournalDate(date: string, locale: Locale): string {
  return format(date, locale, { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Month heading for grouped history, e.g. "July 2026". */
export function formatMonthLabel(date: string, locale: Locale): string {
  return format(date, locale, { month: 'long', year: 'numeric' })
}

/** 'YYYY-MM' grouping key for a date key. */
export function monthKey(date: string): string {
  return date.slice(0, 7)
}
