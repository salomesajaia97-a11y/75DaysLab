'use client'
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Camera, Loader2 } from 'lucide-react'
import type { FoodEntry } from '@/types'

interface FoodLoggerProps {
  onLogged: (entry: FoodEntry) => void
}

export function FoodLogger({ onLogged }: FoodLoggerProps) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function logFood() {
    if (!description.trim()) return
    setLoading(true)
    // Phase 1: mock response — no API call
    setTimeout(() => {
      const entry: FoodEntry = {
        id: Date.now().toString(),
        description,
        calories: Math.floor(Math.random() * 400 + 100),
        proteinG: Math.floor(Math.random() * 30 + 5),
        carbsG: Math.floor(Math.random() * 50 + 10),
        fatG: Math.floor(Math.random() * 20 + 3),
        loggedAt: new Date().toISOString(),
      }
      onLogged(entry)
      setDescription('')
      setLoading(false)
    }, 800)
  }

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Describe what you ate... e.g. '2 scrambled eggs with avocado toast'"
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={3}
      />
      <div className="flex gap-2">
        <Button className="flex-1" onClick={logFood} disabled={!description.trim() || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Log Food
        </Button>
        <Button variant="outline" size="icon" onClick={() => fileRef.current?.click()} disabled={loading}>
          <Camera className="h-4 w-4" />
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" />
      </div>
    </div>
  )
}
