'use client'
import { useCallback, useEffect, useState } from 'react'
import type { ChallengeView } from '@/lib/progress'

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
  totalDays: number
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
  /** historical verified completed days (survives attempt resets) */
  totalCompletedDays: number
  /** active challenge summary, or null when none */
  challenge: ChallengeSummary | null
  /** accurately-labeled, server-owned challenge view, or null when none */
  view: ChallengeView | null
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
  // bump to force a re-fetch (e.g. after a completion elsewhere on the page)
  const [nonce, setNonce] = useState(0)
  const refetch = useCallback(() => setNonce(n => n + 1), [])

  useEffect(() => {
    let active = true
    fetch('/api/daily-progress', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: DailyProgress) => {
        if (!active) return
        setData(d)
        setError(false)
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
  }, [nonce])

  return { data, loading, error, refetch }
}
