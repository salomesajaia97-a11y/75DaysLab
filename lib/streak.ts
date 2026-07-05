// Streak / challenge state engine — the server-authoritative source of truth for
// 75 Hard progress. Pure functions only (no DB, no clock): callers pass the
// current date so behavior is deterministic and unit-testable. The DB wrapper
// that loads/persists a Challenge lives in lib/daily-log.ts (Phase T4).

/** The six semantic completion flags stored on a DailyLog. */
export interface DailyCompletionFlags {
  waterCompleted: boolean
  journalCompleted: boolean
  nutritionCompleted: boolean
  structuredWorkoutCompleted: boolean
  outdoorWorkoutCompleted: boolean
  photoUploaded: boolean
}

/** 75 Hard requires TWO workouts — the workout task counts only when both are done. */
export function isWorkoutComplete(
  f: Pick<DailyCompletionFlags, 'structuredWorkoutCompleted' | 'outdoorWorkoutCompleted'>
): boolean {
  return f.structuredWorkoutCompleted && f.outdoorWorkoutCompleted
}

/** True when every daily task is satisfied (both workouts count as one). */
export function computeAllComplete(f: DailyCompletionFlags): boolean {
  return (
    f.waterCompleted &&
    f.journalCompleted &&
    f.nutritionCompleted &&
    isWorkoutComplete(f) &&
    f.photoUploaded
  )
}

/** Back-compat alias: evaluate a full DailyLog-shaped record. */
export function isDayComplete(log: DailyCompletionFlags): boolean {
  return computeAllComplete(log)
}

// ---------------------------------------------------------------------------
// Challenge state machine
// ---------------------------------------------------------------------------

/** Date-only calendar helpers. All dates are 'YYYY-MM-DD' in UTC (matches the
 *  rest of the codebase, which buckets logs by `toISOString().split('T')[0]`). */

export function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return toDateStr(d)
}

/** Whole-day difference `b - a` (positive when b is later). */
export function diffDays(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00.000Z`).getTime()
  const db = new Date(`${b}T00:00:00.000Z`).getTime()
  return Math.round((db - da) / 86_400_000)
}

export interface ChallengeState {
  /** 'YYYY-MM-DD' — start of the current attempt (moves forward on a reset) */
  startDate: string
  totalDays: number
  currentDay: number
  currentStreak: number
  longestStreak: number
  /** 'YYYY-MM-DD' of the most recent fully-complete day, if any */
  lastCompletedDate?: string
}

export interface ChallengeEvalInput {
  /** 'YYYY-MM-DD' — the day being evaluated */
  today: string
  /** whether today's DailyLog is fully complete right now */
  todayComplete: boolean
}

/**
 * True when the current attempt has lapsed — i.e. a full day elapsed without a
 * completion, so 75 Hard demands a hard reset to Day 1. Derived purely from the
 * stored dates so it self-heals on any read (no per-day cron needed):
 *   - once completed at least once: broken if the last completion is >1 day old
 *   - never completed: broken if the start day is already in the past
 */
export function isAttemptBroken(state: ChallengeState, today: string): boolean {
  if (state.lastCompletedDate) return diffDays(state.lastCompletedDate, today) > 1
  return diffDays(state.startDate, today) >= 1
}

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi)

/**
 * Advance a challenge given today's completion status. Deterministic and pure.
 * Handles hard reset (missed day → restart today) and streak counting. In a
 * healthy attempt every day is completed, so the streak is fully derivable from
 * the calendar: `daysElapsedSinceStart + (todayComplete ? 1 : 0)`.
 */
export function nextChallengeState(
  state: ChallengeState,
  input: ChallengeEvalInput
): ChallengeState {
  const { today, todayComplete } = input

  let startDate = state.startDate
  let lastCompletedDate = state.lastCompletedDate

  // 1. Hard reset if the attempt lapsed — restart the challenge today.
  if (isAttemptBroken(state, today)) {
    startDate = today
    lastCompletedDate = undefined
  }

  // 2. Record today's completion (idempotent within the same day).
  if (todayComplete) lastCompletedDate = today

  // 3. Derive counters. In a live (unbroken) attempt all prior days were
  //    completed, so elapsed days == completed days.
  const elapsed = diffDays(startDate, today)
  const currentStreak = Math.max(0, elapsed + (todayComplete ? 1 : 0))
  const currentDay = clamp(elapsed + 1, 1, state.totalDays)
  const longestStreak = Math.max(state.longestStreak, currentStreak)

  return {
    ...state,
    startDate,
    currentDay,
    currentStreak,
    longestStreak,
    lastCompletedDate,
  }
}
