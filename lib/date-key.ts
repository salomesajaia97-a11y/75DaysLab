// Canonical clock + timezone day-key service (Phase 2D-1).
//
// This is the SINGLE source of truth for four concerns that were previously
// re-implemented inline (and UTC-only) across the codebase:
//   1. the current instant        → currentInstant(clock)
//   2. the current logical day     → currentDayKey(timeZone, clock)
//   3. date-key generation         → dayKey(instant, timeZone)
//   4. timezone resolution         → resolveTimeZone(sources)
//
// Design notes:
//   - Pure functions + an INJECTABLE clock (no ambient `new Date()` baked into
//     callers), so behavior is deterministic and unit-testable. Mirrors the
//     pure style of lib/streak.ts and lib/progress.ts.
//   - Day keys are the civil date IN A GIVEN IANA ZONE, computed via
//     Intl.DateTimeFormat — NOT via UTC offsets — so DST-observing zones are
//     handled correctly by the platform's tz database.
//   - The day-key format is the SAME 'YYYY-MM-DD' string used everywhere today,
//     so downstream indexes/records need no format change when phases integrate.
//
// NOT WIRED IN YET: nothing in production imports this module in Phase 2D-1.
// Future phases (2D-3+) will replace inline `new Date().toISOString().split('T')[0]`
// calls with this service. The user/challenge timezone fields it can consume do
// not exist yet — resolveTimeZone already tolerates their absence.

/** A source of "now". The default reads the system clock; tests inject a fake. */
export type Clock = () => Date

/** The real wall clock. The only place `new Date()` is called for "now". */
export const systemClock: Clock = () => new Date()

/**
 * Default application timezone. Georgia's correct IANA identifier is
 * `Asia/Tbilisi` (UTC+4, no DST). NOTE: `Europe/Tbilisi` is NOT a real IANA
 * zone and is rejected by isValidTimeZone.
 */
export const DEFAULT_TIME_ZONE = 'Asia/Tbilisi'

/** The current instant, from an injectable clock (defaults to the system clock). */
export function currentInstant(clock: Clock = systemClock): Date {
  return clock()
}

/**
 * True when `tz` is an IANA identifier the runtime's Intl tz database accepts
 * (e.g. 'UTC', 'Asia/Tbilisi', 'America/New_York'). Uses the canonical trick:
 * constructing a DateTimeFormat with an unknown `timeZone` throws a RangeError.
 * Rejects non-strings, empty strings, UTC offsets, and unknown names.
 *
 * Numeric UTC-offset forms ('+04:00', '+04', '-0800') are rejected on purpose:
 * this service is IANA-only (offsets do not carry DST rules). Named fixed-offset
 * zones like 'Etc/GMT+4' remain valid.
 */
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || tz.length === 0) return false
  // Reject numeric offset literals (leading + or -), which V8 otherwise accepts.
  if (/^[+-]/.test(tz)) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/**
 * The civil date at `instant`, observed in `timeZone`, as 'YYYY-MM-DD'.
 * Throws on an invalid instant (NaN) or an invalid timezone.
 */
export function dayKey(instant: Date, timeZone: string): string {
  if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) {
    throw new TypeError('dayKey: invalid instant')
  }
  if (!isValidTimeZone(timeZone)) {
    throw new RangeError(`dayKey: invalid timeZone '${timeZone}'`)
  }
  // en-CA formats as 'YYYY-MM-DD'. Build from parts so the result is independent
  // of any locale/format quirks and is always zero-padded.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant)

  const get = (type: 'year' | 'month' | 'day') => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** The logical "today" for `timeZone`, from an injectable clock. */
export function currentDayKey(timeZone: string, clock: Clock = systemClock): string {
  return dayKey(currentInstant(clock), timeZone)
}

/** Timezone resolution inputs. All optional — future user/challenge fields. */
export interface TimeZoneSources {
  /** the timezone snapshotted on the active challenge (highest precedence) */
  challengeTimeZone?: string | null
  /** the user profile's timezone */
  userTimeZone?: string | null
  /** the fallback default (defaults to DEFAULT_TIME_ZONE) */
  defaultTimeZone?: string | null
}

/**
 * Resolve the effective timezone with precedence: challenge → user → default.
 * Invalid or absent (null/undefined/empty) sources are skipped so a bad stored
 * value can never break day computation. Always returns a valid IANA zone —
 * falls back to DEFAULT_TIME_ZONE when every source is invalid/absent.
 */
export function resolveTimeZone(sources: TimeZoneSources = {}): string {
  const { challengeTimeZone, userTimeZone, defaultTimeZone } = sources
  for (const candidate of [challengeTimeZone, userTimeZone, defaultTimeZone]) {
    if (isValidTimeZone(candidate)) return candidate
  }
  return DEFAULT_TIME_ZONE
}

/** Inputs for the version-gated "logical today" decision. */
export interface LogicalTodayInput {
  /** the instant to evaluate (typically currentInstant(clock)) */
  instant: Date
  /** the active challenge's timezone snapshot, if any (highest precedence) */
  challengeTimeZone?: string | null
  /** the user profile's timezone, if any */
  userTimeZone?: string | null
  /** the day-key convention version; defaults to 1 (legacy). */
  dateKeyVersion?: number | null
}

/**
 * The logical calendar day ('YYYY-MM-DD') for a given instant, gated by the
 * day-key version:
 *   - version 1 (legacy, the default): UTC-derived — byte-for-byte identical to
 *     the historical `new Date().toISOString().split('T')[0]`. Stored timezones
 *     are intentionally ignored so existing challenges behave EXACTLY as before.
 *   - version >= 2: timezone-aware — the civil date in the resolved zone
 *     (challenge -> user -> DEFAULT_TIME_ZONE).
 */
export function logicalToday(input: LogicalTodayInput): string {
  const version = input.dateKeyVersion ?? 1
  if (version >= 2) {
    const timeZone = resolveTimeZone({
      challengeTimeZone: input.challengeTimeZone,
      userTimeZone: input.userTimeZone,
    })
    return dayKey(input.instant, timeZone)
  }
  return dayKey(input.instant, 'UTC')
}

/** Minimal shapes the day-key contract reads from a loaded Challenge / User. */
export interface ChallengeDayContext {
  timeZone?: string | null
  dateKeyVersion?: number | null
}
export interface UserDayContext {
  timeZone?: string | null
}

/**
 * THE shared caller-to-recompute contract. Given an instant and the loaded
 * (challenge, user), return the logical day key. recomputeDailyLog and every
 * direct caller call this exact function, so the date a caller writes/passes can
 * never disagree with the day recomputeDailyLog treats as "today". Pure — does
 * not mutate its inputs, performs no I/O.
 */
export function logicalTodayFor(
  instant: Date,
  challenge: ChallengeDayContext | null | undefined,
  user: UserDayContext | null | undefined
): string {
  return logicalToday({
    instant,
    challengeTimeZone: challenge?.timeZone,
    userTimeZone: user?.timeZone,
    dateKeyVersion: challenge?.dateKeyVersion,
  })
}
