'use client'
import { useState } from 'react'
import { Slider } from '@/components/ui/slider'

interface PhotoComparisonProps {
  beforeUrl: string
  afterUrl: string
  beforeLabel: string
  afterLabel: string
}

export function PhotoComparison({ beforeUrl, afterUrl, beforeLabel, afterLabel }: PhotoComparisonProps) {
  const [split, setSplit] = useState(50)

  return (
    <div className="space-y-4">
      <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-border bg-muted">
        {/* After photo (right side, full width) */}
        <img src={afterUrl} alt={afterLabel} className="absolute inset-0 w-full h-full object-cover" />
        {/* Before photo (left side, clipped) */}
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${split}%` }}>
          <img
            src={beforeUrl}
            alt={beforeLabel}
            className="absolute inset-0 h-full object-cover"
            style={{ width: `${10000 / split}%` }}
          />
        </div>
        {/* Divider */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
          style={{ left: `${split}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
            <span className="text-xs font-bold text-black select-none">⟺</span>
          </div>
        </div>
        {/* Labels */}
        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded z-10">{beforeLabel}</div>
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded z-10">{afterLabel}</div>
      </div>
      <Slider
        value={[split]}
        onValueChange={(v) => setSplit(Array.isArray(v) ? v[0] : v)}
        min={10}
        max={90}
        step={1}
        className="w-full"
      />
      <p className="text-xs text-center text-muted-foreground">Drag slider to compare</p>
    </div>
  )
}
