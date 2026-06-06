'use client'
import { useState, useCallback, useEffect } from 'react'
import { getWaterConsumed, saveWaterConsumed, todayString } from '@/lib/storage'

interface WaterState {
  consumedMl: number
  goalMl: number
}

export function useWaterTracker(initial: WaterState) {
  const today = todayString()
  const [consumed, setConsumed] = useState(initial.consumedMl)
  const [goalMl] = useState(initial.goalMl)

  useEffect(() => {
    const saved = getWaterConsumed(today)
    if (saved > 0) setConsumed(saved)
  }, [today])

  const addWater = useCallback((amountMl: number) => {
    setConsumed(prev => {
      const next = prev + amountMl
      saveWaterConsumed(today, next)
      return next
    })
  }, [today])

  const percent = Math.min((consumed / goalMl) * 100, 100)
  const remainingMl = Math.max(goalMl - consumed, 0)

  return { consumed, goalMl, percent, remainingMl, addWater }
}
