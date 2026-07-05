'use client'
import { useEffect, useState } from 'react'

export interface DailyFlags {
  waterCompleted: boolean
  journalCompleted: boolean
  nutritionCompleted: boolean
  structuredWorkoutCompleted: boolean
  outdoorWorkoutCompleted: boolean
  workoutCompleted: boolean
  photoUploaded: boolean
  allComplete: boolean
}

export interface ChallengeSummary {
  currentDay: number
  currentStreak: number
  longestStreak: number
  startDate: string
  lastCompletedDate: string | null
}

export interface DailyProgress {
  /** backward-compatible top-level fields */
  workoutCompleted: boolean
  waterMl: number
  calorieTarget: number
  /** full daily completion flags */
  flags: DailyFlags
  /** active challenge summary, or null when none */
  challenge: ChallengeSummary | null
}

/**
 * Read the server-authoritative daily completion + challenge state. The GET is
 * self-healing (recomputes today + advances the streak). Consumers should treat
 * this as the source of truth and fall back to localStorage only when `error`.
 */
export function useDailyProgress() {
  const [data, setData] = useState<DailyProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/daily-progress')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: DailyProgress) => {
        if (!active) return
        setData(d)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError(true)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { data, loading, error }
}
