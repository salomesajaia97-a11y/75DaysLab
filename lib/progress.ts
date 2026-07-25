// Pure helpers for the server-authoritative daily-progress surface. No DB, no
// clock — callers pass "today" so behavior is deterministic and unit-testable.
// The dashboard and /api/daily-progress use these to present clearly-labeled,
// server-owned challenge values (never localStorage-derived).

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

/** True when `s` is a real calendar day in strict YYYY-MM-DD form (UTC). */
export function isValidDayString(s: unknown): boolean {
  if (typeof s !== 'string' || !DAY_RE.test(s)) return false
  const d = new Date(`${s}T00:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return false
  // round-trip guard rejects overflow like 2026-02-29 / 2026-13-01
  return d.toISOString().slice(0, 10) === s
}

/** True when `day` is strictly after `today` (both YYYY-MM-DD). */
export function isFutureDay(day: string, today: string): boolean {
  return day > today
}

/** The distinct, accurately-labeled challenge values the dashboard shows.
 *  Every field is server-owned; none is a calendar-day count masquerading as
 *  "completed days". */
export interface ChallengeView {
  /** the selected challenge length: 30 | 40 | 55 | 75 */
  totalDays: number
  /** current ATTEMPT day (1..totalDays); resets to 1 on a missed day. Drives the
   *  streak engine — NOT the user-facing "Challenge Day" (use challengeDay). */
  attemptDay: number
  /** CALENDAR days since the challenge started (1..totalDays), monotonic and
   *  completion-independent — never resets on a missed day. This is the value
   *  shown as "Challenge Day". Derived from the immutable start anchor in the
   *  timezone-aware read layer; falls back to attemptDay when not supplied. */
  challengeDay: number
  /** consecutive complete days in the current attempt */
  currentStreak: number
  /** best streak ever — preserved across resets */
  longestStreak: number
  /** historical count of verified fully-complete days (survives resets) */
  totalCompletedDays: number
  /** days left in the current attempt (never negative) */
  daysRemaining: number
  /** the current attempt has reached the selected length */
  isComplete: boolean
}

export interface RawChallenge {
  totalDays: number
  currentDay: number
  currentStreak: number
  longestStreak: number
}

export function buildChallengeView(
  raw: RawChallenge,
  totalCompletedDays: number,
  /** calendar days since start; defaults to attemptDay for callers that don't
   *  supply the immutable start anchor (keeps the value present and sane). */
  challengeDay: number = raw.currentDay
): ChallengeView {
  const totalDays = raw.totalDays
  const attemptDay = raw.currentDay
  return {
    totalDays,
    attemptDay,
    challengeDay,
    currentStreak: raw.currentStreak,
    longestStreak: raw.longestStreak,
    totalCompletedDays,
    daysRemaining: Math.max(0, totalDays - attemptDay),
    isComplete: raw.currentStreak >= totalDays,
  }
}

/** Zero state for a user with no active challenge (default 75-day length). */
export const EMPTY_CHALLENGE_VIEW: ChallengeView = {
  totalDays: 75,
  attemptDay: 1,
  challengeDay: 1,
  currentStreak: 0,
  longestStreak: 0,
  totalCompletedDays: 0,
  daysRemaining: 74,
  isComplete: false,
}
