'use client'
import { useEffect, useState } from 'react'
import type { WgerExercise } from '@/lib/fitness/wger'

interface WgerLoopProps {
  exercises: WgerExercise[]
}

/**
 * Renders wger exercises and alternates each card between its two phase images
 * every 1s — a lightweight GIF effect with no heavy .gif files. A single
 * shared interval drives every card (one timer, not one per exercise).
 * Single-image exercises stay static (no flicker).
 */
export function WgerLoop({ exercises }: WgerLoopProps) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setPhase(p => p ^ 1), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {exercises.map(ex => {
        const src = ex.images[phase % ex.images.length]
        return (
          <figure
            key={ex.id}
            className="overflow-hidden rounded-xl border border-border bg-background"
          >
            <div className="relative aspect-square bg-muted">
              {/* wger images are absolute CC-BY-SA URLs — plain img avoids
                  next.config image-domain config. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={ex.name}
                loading="lazy"
                className="h-full w-full object-contain transition-opacity duration-300"
              />
              {ex.animated && (
                <span className="absolute right-1.5 top-1.5 rounded-full bg-foreground/70 px-1.5 py-0.5 text-[9px] font-medium text-background">
                  ● live
                </span>
              )}
            </div>
            <figcaption className="truncate px-2 py-1.5 text-xs font-medium" title={ex.name}>
              {ex.name}
            </figcaption>
          </figure>
        )
      })}
    </div>
  )
}
