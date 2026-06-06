'use client'
import { useState, useCallback, useEffect } from 'react'
import { getWaterConsumed, saveWaterConsumed, todayString } from '@/lib/storage'

interface WaterState {
  consumedMl: number
  goalMl: number
}

export function useWaterTracker({ consumedMl, goalMl }: WaterState) {
  const today = todayString()
  const [consumed, setConsumed] = useState(consumedMl)

  useEffect(() => {
    setConsumed(getWaterConsumed(today))
  }, [today])

  const addWater = useCallback((amountMl: number) => {
    setConsumed(prev => {
      const next = prev + amountMl
      saveWaterConsumed(today, next)
      return next
    })
  }, [today])

  // goalMl from prop — always current (no stale useState capture)
  const percent = Math.min((consumed / goalMl) * 100, 100)
  const remainingMl = Math.max(goalMl - consumed, 0)

  return { consumed, percent, remainingMl, addWater }
}
