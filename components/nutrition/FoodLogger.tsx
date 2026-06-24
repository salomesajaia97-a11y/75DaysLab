'use client'
import { useState, useRef } from 'react'
import { Loader2, ScanLine } from 'lucide-react'
import type { FoodEntry } from '@/types'
import { MealChips } from './MealChips'
import { mealFromTime, type MealType } from '@/lib/nutrition-meal'

interface FoodLoggerProps {
  onLogged: (entry: FoodEntry) => void
}

export function FoodLogger({ onLogged }: FoodLoggerProps) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [meal, setMeal] = useState<MealType>(() => mealFromTime(new Date()))
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined)
  const [scanning, setScanning] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setScanning(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('image', f)
      const res = await fetch('/api/nutrition/scan', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPhotoUrl(data.photoUrl)
      if (data.macros) {
        setDescription(data.macros.food || 'Scanned meal')
      } else {
        setError("Couldn't read the photo — describe it instead.")
      }
    } catch {
      setError('Photo scan failed. Try again or describe it.')
    } finally {
      setScanning(false)
      e.target.value = ''
    }
  }

  async function logFood() {
    const text = description.trim()
    if (!text) return
    setLoading(true)
    setError(null)
    try {
      const aiRes = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, mode: 'food_log' }),
      })
      const aiData = await aiRes.json()
      const macros = aiData.macros ?? { food: text, calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }

      const saveRes = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: macros.food || text,
          calories: macros.calories,
          proteinG: macros.proteinG,
          carbsG: macros.carbsG,
          fatG: macros.fatG,
          meal,
          photoUrl,
        }),
      })
      const saved = await saveRes.json()

      const entry: FoodEntry = {
        id: saved._id ?? Date.now().toString(),
        description: macros.food || text,
        calories: macros.calories,
        proteinG: macros.proteinG,
        carbsG: macros.carbsG,
        fatG: macros.fatG,
        loggedAt: new Date().toISOString(),
        meal,
        photoUrl,
      }
      onLogged(entry)
      setDescription('')
      setPhotoUrl(undefined)
      setMeal(mealFromTime(new Date()))
    } catch {
      setError('Failed to log food. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) logFood()
  }

  const canSubmit = description.trim().length > 0 && !loading

  return (
    <div className="space-y-3">
      <MealChips value={meal} onChange={setMeal} />
      <div
        className="relative rounded-xl overflow-hidden transition-shadow duration-200"
        style={{
          background: 'var(--background)',
          border: '1px solid var(--border)',
          boxShadow: '0 1px 3px rgba(45,49,66,0.04)',
        }}
      >
        <textarea
          rows={3}
          placeholder="What did you eat? e.g. '2 scrambled eggs with avocado toast'"
          value={description}
          onChange={e => setDescription(e.target.value)}
          onKeyDown={handleKey}
          className="w-full resize-none bg-transparent px-4 pt-3.5 pb-10 text-sm outline-none placeholder:text-muted-foreground"
          style={{ color: 'var(--foreground)', fontFamily: 'inherit' }}
        />

        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={loading || scanning}
            className="flex items-center gap-1.5 text-xs transition-opacity"
            style={{ color: 'var(--muted-foreground)', opacity: loading || scanning ? 0.4 : 1 }}
          >
            {scanning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ScanLine className="h-3.5 w-3.5" />
            )}
            <span>{scanning ? 'scanning…' : 'scan photo'}</span>
          </button>

          <button
            type="button"
            onClick={logFood}
            disabled={!canSubmit}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200"
            style={{
              background: canSubmit ? 'var(--foreground)' : 'var(--muted)',
              color: canSubmit ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            Log Food
          </button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
