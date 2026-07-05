'use client'
import { useCallback, useEffect, useState } from 'react'
import { todayString } from '@/lib/storage'
import {
  getDayProgress,
  logWorkout,
  WORKOUT_UPDATED_EVENT,
  type DayProgress,
  type WorkoutLogEntry,
} from '@/lib/fitness/workoutLog'

export interface FitnessProgress {
  /** past 7 dates, oldest → today (YYYY-MM-DD) */
  days: string[]
  today: string
  /** per-day structured/outdoor slots */
  dayState: Record<string, DayProgress>
  todayState: DayProgress
  totalSessions: number
  fullDays: number
  completionRate: number
  /** append a completed structured workout (defaults to today); updates live */
  logWorkout: typeof logWorkout
  /** force a recompute (rarely needed — writes auto-notify) */
  refresh: () => void
}

function past7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

const EMPTY: DayProgress = { structured: false, outdoor: false }

function compute(): Pick<
  FitnessProgress,
  'days' | 'today' | 'dayState' | 'todayState' | 'totalSessions' | 'fullDays' | 'completionRate'
> {
  const days = past7Days()
  const today = todayString()
  const dayState: Record<string, DayProgress> = {}
  for (const d of days) dayState[d] = getDayProgress(d)

  const totalSessions = days.reduce(
    (acc, d) => acc + (dayState[d].structured ? 1 : 0) + (dayState[d].outdoor ? 1 : 0),
    0,
  )
  const fullDays = days.filter(d => dayState[d].structured && dayState[d].outdoor).length
  const completionRate = Math.round((totalSessions / 14) * 100)

  return { days, today, dayState, todayState: dayState[today] ?? EMPTY, totalSessions, fullDays, completionRate }
}

/** SSR-safe empty state (no localStorage on the server / first paint). */
function emptyState() {
  const days = past7Days()
  const today = todayString()
  const dayState: Record<string, DayProgress> = {}
  for (const d of days) dayState[d] = EMPTY
  return { days, today, dayState, todayState: EMPTY, totalSessions: 0, fullDays: 0, completionRate: 0 }
}

/**
 * Live-derived weekly progress. Single reader over the workout log + legacy
 * tracker state; recomputes on any completion (same tab via custom event,
 * other tabs via the storage event).
 */
export function useFitnessProgress(): FitnessProgress {
  const [snap, setSnap] = useState(emptyState)

  const refresh = useCallback(() => {
    setSnap(compute())
  }, [])

  useEffect(() => {
    // hydration: pull real values from localStorage after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
    const onUpdate = () => refresh()
    window.addEventListener(WORKOUT_UPDATED_EVENT, onUpdate)
    window.addEventListener('storage', onUpdate)
    return () => {
      window.removeEventListener(WORKOUT_UPDATED_EVENT, onUpdate)
      window.removeEventListener('storage', onUpdate)
    }
  }, [refresh])

  return { ...snap, logWorkout, refresh }
}

export type { WorkoutLogEntry }
