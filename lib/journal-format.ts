// Presentation-only date formatting for the journal UI.
//
// These helpers NEVER derive a day key — they only render an existing canonical
// 'YYYY-MM-DD' key for humans. The key is parsed as UTC midnight and read with
// UTC getters, so the displayed date always matches the stored key regardless
// of the machine's local zone.
//
// Georgian is formatted from explicit tables rather than Intl: many browser and
// Node builds ship without `ka` locale data (Intl then silently falls back to
// en-US, printing an English date inside a Georgian UI, in a different order
// than the English mode uses). Explicit tables make both locales deterministic
// and identical everywhere.

import type { Locale } from '@/lib/i18n'
import { isValidCivilDate } from '@/lib/date-key'

/** BCP-47 tag for each supported app locale. */
export function intlLocale(locale: Locale): string {
  return locale === 'ge' ? 'ka-GE' : 'en-GB'
}

const KA_MONTHS = [
  'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი',
]

const KA_MONTHS_SHORT = [
  'იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ',
  'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ',
]

/** Indexed by Date#getUTCDay(): 0 = Sunday. */
const KA_WEEKDAYS = ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი']
const KA_WEEKDAYS_SHORT = ['კვი', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ']

function asUtcDate(date: string): Date | null {
  if (!isValidCivilDate(date)) return null
  return new Date(`${date}T00:00:00.000Z`)
}

function formatEn(d: Date, options: Intl.DateTimeFormatOptions, fallback: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...options }).format(d)
  } catch {
    return fallback
  }
}

/** Full day label for the selected-day header, e.g. "Monday, 27 July 2026". */
export function formatJournalDate(date: string, locale: Locale): string {
  const d = asUtcDate(date)
  if (!d) return date
  if (locale === 'ge') {
    return `${KA_WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${KA_MONTHS[d.getUTCMonth()]}, ${d.getUTCFullYear()}`
  }
  return formatEn(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, date)
}

/** Compact label for history rows, e.g. "Mon 27 Jul". */
export function formatShortJournalDate(date: string, locale: Locale): string {
  const d = asUtcDate(date)
  if (!d) return date
  if (locale === 'ge') {
    return `${KA_WEEKDAYS_SHORT[d.getUTCDay()]}, ${d.getUTCDate()} ${KA_MONTHS_SHORT[d.getUTCMonth()]}`
  }
  return formatEn(d, { weekday: 'short', day: 'numeric', month: 'short' }, date)
}

/** Month heading for grouped history, e.g. "July 2026". */
export function formatMonthLabel(date: string, locale: Locale): string {
  const d = asUtcDate(date)
  if (!d) return date
  if (locale === 'ge') return `${KA_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
  return formatEn(d, { month: 'long', year: 'numeric' }, date)
}

/** 'YYYY-MM' grouping key for a date key. */
export function monthKey(date: string): string {
  return date.slice(0, 7)
}
