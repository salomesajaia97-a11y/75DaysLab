'use client'
import { useState } from 'react'
import type { FoodEntry } from '@/types'
import type { MealType } from '@/lib/nutrition-meal'

export interface Macros {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  food?: string
}

const ZERO: Macros = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }

export interface UseFoodLogging {
  loading: boolean
  scanning: boolean
  error: string | null
  clearError(): void
  estimateText(text: string): Promise<Macros>
  scanPhoto(file: File): Promise<{ macros: Macros | null; photoUrl?: string }>
  save(input: { description: string; macros: Macros; meal: MealType; photoUrl?: string }): Promise<FoodEntry | null>
}

export function useFoodLogging(): UseFoodLogging {
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function estimateText(text: string): Promise<Macros> {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, mode: 'food_log' }),
    })
    const data = await res.json()
    return data.macros ?? { ...ZERO, food: text }
  }

  async function scanPhoto(file: File): Promise<{ macros: Macros | null; photoUrl?: string }> {
    setScanning(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/nutrition/scan', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return { macros: data.macros ?? null, photoUrl: data.photoUrl }
    } catch {
      setError('Photo scan failed. Try again or describe it.')
      return { macros: null }
    } finally {
      setScanning(false)
    }
  }

  async function save(input: {
    description: string
    macros: Macros
    meal: MealType
    photoUrl?: string
  }): Promise<FoodEntry | null> {
    const { description, macros, meal, photoUrl } = input
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          calories: macros.calories,
          proteinG: macros.proteinG,
          carbsG: macros.carbsG,
          fatG: macros.fatG,
          meal,
          photoUrl,
        }),
      })
      const saved = await res.json()
      if (!res.ok) throw new Error(saved.error)
      return {
        id: saved._id ?? Date.now().toString(),
        description,
        calories: macros.calories,
        proteinG: macros.proteinG,
        carbsG: macros.carbsG,
        fatG: macros.fatG,
        loggedAt: saved.loggedAt ?? new Date().toISOString(),
        meal,
        photoUrl,
      }
    } catch {
      setError('Failed to log food. Try again.')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { loading, scanning, error, clearError: () => setError(null), estimateText, scanPhoto, save }
}
