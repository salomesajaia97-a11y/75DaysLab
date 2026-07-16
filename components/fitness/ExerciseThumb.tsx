'use client'

import { useEffect, useState } from 'react'
import { PersonStanding, Target, Dumbbell, Footprints, HeartPulse, Flower2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExerciseFocus } from '@/lib/fitness/exerciseLottieRegistry'
import { CharacterExercisePlayer } from './CharacterExercisePlayer'

const FOCUS_STYLE: Record<ExerciseFocus, { icon: LucideIcon; grad: string; fg: string }> = {
  full:   { icon: PersonStanding, grad: 'linear-gradient(135deg, #d6f5e2 0%, #cdeee6 100%)', fg: '#20a06b' },
  core:   { icon: Target,         grad: 'linear-gradient(135deg, #dbeaff 0%, #cdeee6 100%)', fg: '#3b82c4' },
  upper:  { icon: Dumbbell,       grad: 'linear-gradient(135deg, #ffe8d6 0%, #f3e2f5 100%)', fg: '#c4763b' },
  lower:  { icon: Footprints,     grad: 'linear-gradient(135deg, #f3e2f5 0%, #dbeaff 100%)', fg: '#9c4fb0' },
  cardio: { icon: HeartPulse,     grad: 'linear-gradient(135deg, #ffe0e6 0%, #f3e2f5 100%)', fg: '#d4547a' },
  yoga:   { icon: Flower2,        grad: 'linear-gradient(135deg, #e6f5d6 0%, #d6f5e2 100%)', fg: '#5a9c2f' },
}

interface Props {
  focus: ExerciseFocus[]
  exerciseSlug?: string | null
  className?: string
  size?: number
}

export function ExerciseThumb({ focus, exerciseSlug, className, size = 40 }: Props) {
  const key = focus[0] ?? 'full'
  const style = FOCUS_STYLE[key] ?? FOCUS_STYLE.full
  const Icon = style.icon
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const showCharacter = !!exerciseSlug && !reduced

  return (
    <div
      className={cn('relative flex items-center justify-center overflow-hidden', className)}
      style={{ background: style.grad }}
    >
      {showCharacter ? (
        <CharacterExercisePlayer slug={exerciseSlug} className="h-full w-full" />
      ) : (
        <Icon style={{ width: size, height: size, color: style.fg }} strokeWidth={1.5} />
      )}
    </div>
  )
}
