// Pure presentation helpers for the daily-progress dashboard & history. Derived
// stats ONLY — no DB, no clock, and NO completion rules of its own: status is
// delegated to the canonical computeDayResult so the 3/5 & 5/5 thresholds live
// in exactly one place (lib/daily-log.ts). Fully unit-testable.

import { computeDayResult, DAILY_TASK_COUNT, type CanonicalTasks } from './daily-log'

/** The three product-defined day classifications. Perfect ⊂ Completed. */
export type DayStatus = 'incomplete' | 'completed' | 'perfect'

/** A single day's presentation summary. `hasRecord` is false when no DailyLog
 *  exists for the date (→ UI shows "No activity"); its counts are then zero. */
export interface DaySummary {
  date: string
  hasRecord: boolean
  completedTaskCount: number
  totalTasks: number
  /** 0,20,40,60,80,100 — count / 5 as a whole percent */
  percent: number
  status: DayStatus
}

/** Whole-percent completion for a task count (0..5 → 0,20,40,60,80,100). */
export function percentComplete(completedTaskCount: number): number {
  const clamped = Math.min(Math.max(completedTaskCount, 0), DAILY_TASK_COUNT)
  return Math.round((clamped / DAILY_TASK_COUNT) * 100)
}

/** Classify a day from its canonical tasks via the shared threshold calc. */
export function dayStatusFromTasks(tasks: CanonicalTasks): DayStatus {
  const r = computeDayResult(tasks)
  if (r.isPerfectDay) return 'perfect'
  if (r.isCompletedDay) return 'completed'
  return 'incomplete'
}

/**
 * Summarize one day for the dashboard/history. Pass the stored canonical task
 * booleans, or `null` when the day has no DailyLog record at all.
 */
export function summarizeDay(date: string, tasks: CanonicalTasks | null): DaySummary {
  if (!tasks) {
    return {
      date,
      hasRecord: false,
      completedTaskCount: 0,
      totalTasks: DAILY_TASK_COUNT,
      percent: 0,
      status: 'incomplete',
    }
  }
  const r = computeDayResult(tasks)
  return {
    date,
    hasRecord: true,
    completedTaskCount: r.completedTaskCount,
    totalTasks: DAILY_TASK_COUNT,
    percent: percentComplete(r.completedTaskCount),
    status: r.isPerfectDay ? 'perfect' : r.isCompletedDay ? 'completed' : 'incomplete',
  }
}
