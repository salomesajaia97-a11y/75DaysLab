// Structured-workout completion log — the forward-looking source of truth for
// "did the user do a structured session today". Phase A introduces the store +
// derivation; writes are wired in Phase B (Mark complete on wizard/library/plan).
//
// Day model stays dual-dot (unchanged): a day's "structured" slot is done if the
// legacy WorkoutTrackerState.indoor.done is true OR any structured log entry
// exists for that date. "outdoor" comes from the legacy outdoor slot. This keeps
// existing calendar/stats behavior identical while letting new completions count.

import { getWorkoutState, scopedKey } from '@/lib/storage'

const LOG_KEY = '75lab_workout_log'
/** Fired after any log write so live subscribers (useFitnessProgress) recompute. */
export const WORKOUT_UPDATED_EVENT = '75lab:workout-updated'

export type WorkoutSource = 'builder' | 'plan' | 'library' | 'exercise' | 'outdoor'

export interface WorkoutLogEntry {
  id: string
  /** YYYY-MM-DD */
  date: string
  /** structured = indoor/home/gym session; outdoor handled by legacy slot */
  kind: 'structured' | 'outdoor'
  source: WorkoutSource
  title: string
  exerciseSlugs: string[]
  minutes: number
  /** ISO timestamp */
  completedAt: string
}

/** Per-day derived slots that feed the calendar + stats. */
export interface DayProgress {
  structured: boolean
  outdoor: boolean
}

function isBrowser() {
  return typeof window !== 'undefined'
}

function keyFor(date: string) {
  return scopedKey(`${LOG_KEY}_${date}`)
}

function genId(): string {
  if (isBrowser() && 'randomUUID' in crypto) return crypto.randomUUID()
  return `w_${Date.now()}_${Math.floor(Math.random() * 1e6)}`
}

/** Read raw structured entries logged for a given date. */
export function getEntries(date: string): WorkoutLogEntry[] {
  if (!isBrowser()) return []
  const raw = localStorage.getItem(keyFor(date))
  if (!raw) return []
  try {
    return JSON.parse(raw) as WorkoutLogEntry[]
  } catch {
    return []
  }
}

/**
 * Append a completed structured workout for `date` (defaults to today) and
 * notify subscribers. Returns the created entry.
 */
export function logWorkout(
  input: Omit<WorkoutLogEntry, 'id' | 'completedAt'> & { completedAt?: string },
): WorkoutLogEntry | null {
  if (!isBrowser()) return null
  const entry: WorkoutLogEntry = {
    ...input,
    id: genId(),
    completedAt: input.completedAt ?? new Date().toISOString(),
  }
  const existing = getEntries(entry.date)
  localStorage.setItem(keyFor(entry.date), JSON.stringify([...existing, entry]))
  window.dispatchEvent(new CustomEvent(WORKOUT_UPDATED_EVENT))
  return entry
}

/** Remove all structured log entries for a date (notifies subscribers). */
export function clearEntries(date: string): void {
  if (!isBrowser()) return
  localStorage.removeItem(keyFor(date))
  window.dispatchEvent(new CustomEvent(WORKOUT_UPDATED_EVENT))
}

/** True if a structured session exists via new log OR legacy indoor slot. */
export function hasStructured(date: string): boolean {
  if (getEntries(date).some(e => e.kind === 'structured')) return true
  return getWorkoutState(date)?.indoor.done ?? false
}

/** Combined per-day progress (structured + outdoor), the calendar's source. */
export function getDayProgress(date: string): DayProgress {
  const legacy = getWorkoutState(date)
  const entries = getEntries(date)
  return {
    structured: entries.some(e => e.kind === 'structured') || (legacy?.indoor.done ?? false),
    outdoor: entries.some(e => e.kind === 'outdoor') || (legacy?.outdoor.done ?? false),
  }
}
