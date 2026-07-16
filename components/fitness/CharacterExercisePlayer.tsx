'use client'

import { cn } from '@/lib/utils'

interface Props {
  slug: string
  className?: string
  autoplay?: boolean
}

export function CharacterExercisePlayer({ slug, className }: Props) {
  return (
    <div className={cn('relative flex size-full items-center justify-center overflow-hidden', className)}>
      <div className="absolute bottom-[3%] h-[7%] w-[45%] rounded-full bg-slate-300/60 blur-[1px]" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/fitness-character/male-front.png"
        alt=""
        draggable={false}
        className="relative z-10 h-[92%] w-auto max-w-[78%] select-none object-contain"
        data-exercise={slug}
      />
    </div>
  )
}
