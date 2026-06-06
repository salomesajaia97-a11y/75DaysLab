'use client'
import { useState, useCallback, useEffect } from 'react'

interface WaterState {
  consumedMl: number
  goalMl: number
}

export function useWaterTracker({ consumedMl, goalMl }: WaterState) {
  const [consumed, setConsumed] = useState(consumedMl)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    fetch(`/api/water?date=${today}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.totalMl !== undefined) {
          setConsumed(data.totalMl)
        }
      })
      .catch(() => {})
  }, [])

  const addWater = useCallback((amountMl: number) => {
    setConsumed(prev => Math.min(prev + amountMl, goalMl * 1.5))
    fetch('/api/water', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountMl }),
    }).catch(() => {
      setConsumed(prev => Math.max(prev - amountMl, 0))
    })
  }, [goalMl])

  const percent = Math.min((consumed / goalMl) * 100, 100)
  const remainingMl = Math.max(goalMl - consumed, 0)

  return { consumed, percent, remainingMl, addWater }
}
