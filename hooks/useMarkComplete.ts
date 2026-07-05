'use client'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { todayString } from '@/lib/storage'
import { logWorkout, type WorkoutLogEntry } from '@/lib/fitness/workoutLog'

type MarkInput = Omit<WorkoutLogEntry, 'id' | 'completedAt' | 'date'> & { date?: string }

/**
 * Lightweight "mark complete" action. Logs a structured/outdoor workout,
 * shows a success toast, and guards against double-logging within the same
 * component instance (button flips to a completed state). One instance per
 * completable item (card / modal / result).
 */
export function useMarkComplete() {
  const [done, setDone] = useState(false)

  const markComplete = useCallback(
    (input: MarkInput) => {
      if (done) return
      setDone(true)
      logWorkout({ ...input, date: input.date ?? todayString() })
      toast.success('Workout marked complete', { description: input.title })
    },
    [done],
  )

  const reset = useCallback(() => setDone(false), [])

  return { done, markComplete, reset }
}
