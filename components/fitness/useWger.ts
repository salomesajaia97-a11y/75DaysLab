'use client'
import { useCallback, useEffect, useState } from 'react'
import { fetchWgerExercises, type IndoorFocus, type WgerExercise } from '@/lib/fitness/wger'

export type WgerStatus = 'loading' | 'success' | 'empty' | 'error'

interface WgerState {
  status: WgerStatus
  exercises: WgerExercise[]
  reload: () => void
}

/**
 * Loads wger exercises for a focus and exposes explicit fetch states:
 * loading → success | empty | error. Aborts stale requests when the focus
 * changes so a slow earlier request can't overwrite a newer result.
 */
export function useWger(focus: IndoorFocus): WgerState {
  const [status, setStatus] = useState<WgerStatus>('loading')
  const [exercises, setExercises] = useState<WgerExercise[]>([])
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce(n => n + 1), [])

  useEffect(() => {
    let active = true
    // Reset to loading whenever the focus changes, then fetch — intentional.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setStatus('loading')
    setExercises([])

    fetchWgerExercises(focus)
      .then(list => {
        if (!active) return
        if (list.length === 0) {
          setStatus('empty')
          return
        }
        setExercises(list)
        setStatus('success')
      })
      .catch(() => {
        if (active) setStatus('error')
      })

    return () => {
      active = false
    }
  }, [focus, nonce])

  return { status, exercises, reload }
}
