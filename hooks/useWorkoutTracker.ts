'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
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

/**
 * Fire-and-forget sync of a workout completion to the daily-completion spine.
 * localStorage stays the immediate source of truth for the UI; a failed sync
 * only logs a warning and never blocks the local state change.
 * Maps the UI's indoor/outdoor slots to the API's structured/outdoor types.
 */
function syncWorkoutCompletion(slot: 'indoor' | 'outdoor', done: boolean) {
  const type = slot === 'indoor' ? 'structured' : 'outdoor'
  fetch('/api/fitness/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, done }),
  })
    .then(r => {
      if (!r.ok) console.warn(`[useWorkoutTracker] workout sync rejected (${r.status})`)
    })
    .catch(err => console.warn('[useWorkoutTracker] workout sync failed:', err))
}

export function useWorkoutTracker() {
  const [state, setState] = useState<WorkoutTrackerState>(DEFAULT_STATE)
  const [hydrated, setHydrated] = useState(false)
  const todayRef = useRef(todayString())
  const stateRef = useRef(state)

  // Mirror latest state so callbacks can read the pre-toggle value without deps.
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Load from localStorage after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    const saved = getWorkoutState(todayRef.current)
    if (saved) {
      // Pause any running timers on reload (elapsed time not tracked)
      setState({
        indoor: { ...saved.indoor, timerRunning: false },
        outdoor: { ...saved.outdoor, timerRunning: false },
      })
    }
    setHydrated(true)
  }, [])

  // Persist whenever state changes, but only after initial load
  useEffect(() => {
    if (!hydrated) return
    saveWorkoutState(todayRef.current, state)
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
    setState(prev => {
      const s = prev[type]
      if (s.timerFinished || s.timerSeconds === 0) return prev
      return { ...prev, [type]: { ...s, timerRunning: !s.timerRunning } }
    })
  }, [])

  const resetTimer = useCallback((type: 'indoor' | 'outdoor') => {
    const wasDone = stateRef.current[type].done
    setState(prev => ({
      ...prev,
      [type]: { ...prev[type], done: false, timerSeconds: 2700, timerRunning: false, timerFinished: false, showConfirm: false },
    }))
    if (wasDone) syncWorkoutCompletion(type, false)
  }, [])

  const confirmDone = useCallback((type: 'indoor' | 'outdoor') => {
    setState(prev => ({
      ...prev,
      [type]: { ...prev[type], done: true, showConfirm: false },
    }))
    syncWorkoutCompletion(type, true)
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
    const nextDone = !stateRef.current[type].done
    setState(prev => {
      const s = prev[type]
      const done = !s.done
      return {
        ...prev,
        [type]: { ...s, done, ...(done ? { timerRunning: false } : {}) },
      }
    })
    syncWorkoutCompletion(type, nextDone)
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
