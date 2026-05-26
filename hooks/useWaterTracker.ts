'use client'
import { useState, useCallback } from 'react'

interface WaterState {
  consumedMl: number
  goalMl: number
}

export function useWaterTracker(initial: WaterState) {
  const [state, setState] = useState(initial)

  const addWater = useCallback((amountMl: number) => {
    setState(prev => ({ ...prev, consumedMl: Math.min(prev.consumedMl + amountMl, prev.goalMl * 1.5) }))
    // Phase 1: no API call
  }, [])

  const percent = Math.min((state.consumedMl / state.goalMl) * 100, 100)
  const remainingMl = Math.max(state.goalMl - state.consumedMl, 0)

  return { consumed: state.consumedMl, goalMl: state.goalMl, percent, remainingMl, addWater }
}
