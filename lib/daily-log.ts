// Daily completion spine — PURE flag-derivation logic (T2). Kept free of any DB
// or model imports so it stays unit-testable without a MongoDB connection. The
// DB wrapper `recomputeDailyLog` lives in ./recompute-daily-log (T4).

import { computeAllComplete, type DailyCompletionFlags } from './streak'

/** Minimum pages that count a journal day as complete (matches the journal API). */
export const JOURNAL_MIN_PAGES = 10

/** The number of canonical daily tasks (water, journal, nutrition, workout, photo). */
export const DAILY_TASK_COUNT = 5

/** Inclusive threshold at/above which a day is a Completed Day. Perfect = all 5. */
export const COMPLETED_DAY_THRESHOLD = 3

/** Raw, source-derived inputs for a single user-day. */
export interface DailyFlagInputs {
  /** total water logged for the day (ml) */
  waterMl: number
  /** the day's water goal (ml) — computed from the user profile */
  waterGoalMl: number
  /** pages read from the day's journal entry, or null when no entry exists */
  journalPagesRead: number | null
  /** number of food logs recorded for the day */
  foodLogCount: number
  /** whether a progress photo exists for the day */
  photoExists: boolean
  /** explicit workout completion (no source collection yet — set via API) */
  structuredWorkoutCompleted: boolean
  outdoorWorkoutCompleted: boolean
}

/** The five canonical, rolled-up daily task booleans (workout = both sessions). */
export interface CanonicalTasks {
  waterCompleted: boolean
  journalCompleted: boolean
  nutritionCompleted: boolean
  /** true only when BOTH workout sub-sessions are done */
  workoutCompleted: boolean
  photoUploaded: boolean
}

/** The day-level result: how many of the five tasks are done, and the two
 *  independent status facts derived from that count. Perfect ⊂ Completed. */
export interface DayResult {
  completedTaskCount: number
  isCompletedDay: boolean
  isPerfectDay: boolean
}

/**
 * THE canonical completion calculation. Pure, deterministic, idempotent, and the
 * single place the 3/5 and 5/5 thresholds live — never scatter `count >= 3`
 * across routes/components. Counts the five rolled-up tasks (both workout
 * sub-sessions already count as the single `workoutCompleted` task):
 *   count >= 3 → Completed Day ; count === 5 → Perfect Day (also Completed).
 */
export function computeDayResult(tasks: CanonicalTasks): DayResult {
  const completedTaskCount = [
    tasks.waterCompleted,
    tasks.journalCompleted,
    tasks.nutritionCompleted,
    tasks.workoutCompleted,
    tasks.photoUploaded,
  ].filter(Boolean).length

  return {
    completedTaskCount,
    isCompletedDay: completedTaskCount >= COMPLETED_DAY_THRESHOLD,
    isPerfectDay: completedTaskCount === DAILY_TASK_COUNT,
  }
}

/** The full, persistable DailyLog completion shape plus the derived day result.
 *  `allComplete` (all five) is retained unchanged and equals `isPerfectDay`. */
export interface DailyLogFields extends DailyCompletionFlags, DayResult {
  workoutCompleted: boolean
  allComplete: boolean
}

/**
 * Pure derivation of a day's completion flags from source data. Idempotent —
 * given the same inputs it always yields the same flags, which lets the DB
 * recompute be safely re-run (self-healing).
 */
export function computeDailyFlags(i: DailyFlagInputs): DailyLogFields {
  const flags: DailyCompletionFlags = {
    waterCompleted: i.waterGoalMl > 0 && i.waterMl >= i.waterGoalMl,
    journalCompleted: i.journalPagesRead !== null && i.journalPagesRead >= JOURNAL_MIN_PAGES,
    nutritionCompleted: i.foodLogCount >= 1,
    structuredWorkoutCompleted: i.structuredWorkoutCompleted,
    outdoorWorkoutCompleted: i.outdoorWorkoutCompleted,
    photoUploaded: i.photoExists,
  }

  const workoutCompleted = flags.structuredWorkoutCompleted && flags.outdoorWorkoutCompleted
  const result = computeDayResult({
    waterCompleted: flags.waterCompleted,
    journalCompleted: flags.journalCompleted,
    nutritionCompleted: flags.nutritionCompleted,
    workoutCompleted,
    photoUploaded: flags.photoUploaded,
  })

  return {
    ...flags,
    workoutCompleted,
    allComplete: computeAllComplete(flags),
    ...result,
  }
}
