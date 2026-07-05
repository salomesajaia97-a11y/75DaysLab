// Daily completion spine — PURE flag-derivation logic (T2). Kept free of any DB
// or model imports so it stays unit-testable without a MongoDB connection. The
// DB wrapper `recomputeDailyLog` lives in ./recompute-daily-log (T4).

import { computeAllComplete, type DailyCompletionFlags } from './streak'

/** Minimum pages that count a journal day as complete (matches the journal API). */
export const JOURNAL_MIN_PAGES = 10

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

/** The full, persistable DailyLog completion shape. */
export interface DailyLogFields extends DailyCompletionFlags {
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

  return {
    ...flags,
    workoutCompleted: flags.structuredWorkoutCompleted && flags.outdoorWorkoutCompleted,
    allComplete: computeAllComplete(flags),
  }
}
