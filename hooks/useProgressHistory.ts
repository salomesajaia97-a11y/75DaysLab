'use client'
import { useEffect, useState } from 'react'
import type { DaySummary, DayStatus } from '@/lib/day-status'

export type { DaySummary, DayStatus }

export interface ProgressHistory {
  today: string
  /** newest first; length up to the requested window */
  history: DaySummary[]
}

/**
 * Read the server-authoritative recent daily history (read-only; never mutates
 * past records). `nonce` lets callers force a re-fetch after a completion
 * elsewhere on the page, matching useDailyProgress.
 */
export function useProgressHistory(days = 7, nonce = 0) {
  const [data, setData] = useState<ProgressHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`/api/daily-progress/history?days=${days}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: ProgressHistory) => {
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
  }, [days, nonce])

  return { data, loading, error }
}
