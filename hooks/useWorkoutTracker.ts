'use client'
import { useState, useEffect, useCallback } from 'react'
import type { WorkoutTrackerState, WorkoutSessionState } from '@/types'
import { getWorkoutState, saveWorkoutState, todayString } from '@/lib/storage'

const DEFAULT_SESSION: WorkoutSessionState = {
  done: false,
  timerRunning: false,
  timerSeconds: 2700,
  timerFinished: false,
  showConfirm: false,
  showVideos: false,
  intensity: 'medium',
}

const DEFAULT_STATE: WorkoutTrackerState = {
  indoor: { ...DEFAULT_SESSION },
  outdoor: { ...DEFAULT_SESSION },
}

export function useWorkoutTracker() {
  const [state, setState] = useState<WorkoutTrackerState>(DEFAULT_STATE)
  const [hydrated, setHydrated] = useState(false)

  // Load from localStorage after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    const saved = getWorkoutState(todayString())
    if (saved) setState(saved)
    setHydrated(true)
  }, [])

  // Persist whenever state changes, but only after initial load
  useEffect(() => {
    if (!hydrated) return
    saveWorkoutState(todayString(), state)
  }, [state, hydrated])

  // Countdown tick — uses functional setState to avoid stale closure
  useEffect(() => {
    if (!state.indoor.timerRunning && !state.outdoor.timerRunning) return
    const interval = setInterval(() => {
      setState(prev => {
        const next = { ...prev }
        let changed = false
        for (const type of ['indoor', 'outdoor'] as const) {
          if (!prev[type].timerRunning) continue
          changed = true
          const s = prev[type]
          if (s.timerSeconds <= 1) {
            next[type] = { ...s, timerSeconds: 0, timerRunning: false, timerFinished: true, showConfirm: true }
          } else {
            next[type] = { ...s, timerSeconds: s.timerSeconds - 1 }
          }
        }
        return changed ? next : prev
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [state.indoor.timerRunning, state.outdoor.timerRunning])

  const toggleTimer = useCallback((type: 'indoor' | 'outdoor') => {
    setState(prev => ({
      ...prev,
      [type]: { ...prev[type], timerRunning: !prev[type].timerRunning },
    }))
  }, [])

  const resetTimer = useCallback((type: 'indoor' | 'outdoor') => {
    setState(prev => ({
      ...prev,
      [type]: { ...prev[type], timerSeconds: 2700, timerRunning: false, timerFinished: false, showConfirm: false },
    }))
  }, [])

  const confirmDone = useCallback((type: 'indoor' | 'outdoor') => {
    setState(prev => ({
      ...prev,
      [type]: { ...prev[type], done: true, showConfirm: false },
    }))
  }, [])

  const dismissConfirm = useCallback((type: 'indoor' | 'outdoor') => {
    setState(prev => ({
      ...prev,
      [type]: { ...prev[type], showConfirm: false },
    }))
  }, [])

  const toggleVideos = useCallback((type: 'indoor' | 'outdoor') => {
    setState(prev => ({
      ...prev,
      [type]: { ...prev[type], showVideos: !prev[type].showVideos },
    }))
  }, [])

  const manualToggleDone = useCallback((type: 'indoor' | 'outdoor') => {
    setState(prev => ({
      ...prev,
      [type]: { ...prev[type], done: !prev[type].done },
    }))
  }, [])

  const bothDone = state.indoor.done && state.outdoor.done

  return {
    state,
    toggleTimer,
    resetTimer,
    confirmDone,
    dismissConfirm,
    toggleVideos,
    manualToggleDone,
    bothDone,
  }
}
