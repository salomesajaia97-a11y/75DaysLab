'use client'
import { LottiePlayer } from '@/components/ui/LottiePlayer'
import { getAnimationsForFocus, ANIMATION_CREDITS, type ExerciseFocus } from '@/lib/fitness/lottieRegistry'
import { ExternalLink } from 'lucide-react'

interface Props {
  focus: ExerciseFocus
}

export function LottieExerciseGrid({ focus }: Props) {
  const animations = getAnimationsForFocus(focus)

  if (animations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No animations available for this focus.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {animations.map(anim => (
          <figure
            key={anim.id}
            className="overflow-hidden rounded-xl border border-border bg-background"
          >
            <LottiePlayer
              src={anim.file}
              className="aspect-square bg-muted"
            />
            <figcaption className="truncate px-2 py-1.5 text-xs font-medium" title={anim.name}>
              {anim.name}
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="pt-1 border-t border-border/50">
        <p className="text-[10px] text-muted-foreground mb-1">
          Animations via{' '}
          <a
            href="https://iconscout.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            IconScout
          </a>
          {' '}— Digital License (free, commercial use)
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {ANIMATION_CREDITS.map(c => (
            <a
              key={c.creator}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
            >
              {c.creator}
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
