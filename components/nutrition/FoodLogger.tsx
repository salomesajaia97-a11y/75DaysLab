'use client'
import { useState, useRef } from 'react'
import { Loader2, ScanLine } from 'lucide-react'
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

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) logFood()
  }

  const canSubmit = description.trim().length > 0 && !loading

  return (
    <div className="space-y-3">
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
            disabled={loading}
            className="flex items-center gap-1.5 text-xs transition-opacity"
            style={{ color: 'var(--muted-foreground)', opacity: loading ? 0.4 : 1 }}
          >
            <ScanLine className="h-3.5 w-3.5" />
            <span>scan photo</span>
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
      <input ref={fileRef} type="file" accept="image/*" className="hidden" />
    </div>
  )
}
