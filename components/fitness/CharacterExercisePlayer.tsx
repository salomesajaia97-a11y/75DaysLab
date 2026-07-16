'use client'

import { cn } from '@/lib/utils'

interface Props {
  slug: string
  className?: string
  autoplay?: boolean
}

const MOTION_BY_SLUG: Record<string, string> = {
  squat: 'motion-squat',
  'jump-squat': 'motion-squat',
  'wall-pushup': 'motion-push',
  pushup: 'motion-push',
  'pike-pushup': 'motion-push',
  'glute-bridge': 'motion-bridge',
  'bird-dog': 'motion-balance',
  'march-in-place': 'motion-march',
  'high-knees': 'motion-march',
  'side-steps': 'motion-side',
  'walking-lunge': 'motion-lunge',
  'jump-lunge': 'motion-lunge',
  'step-up': 'motion-step',
  plank: 'motion-plank',
  'mountain-climbers': 'motion-climber',
  'fire-hydrant': 'motion-balance',
  burpee: 'motion-burpee',
  'bicycle-crunch': 'motion-core',
}

export function CharacterExercisePlayer({ slug, className, autoplay = true }: Props) {
  const motionClass = autoplay ? MOTION_BY_SLUG[slug] ?? 'motion-idle' : ''

  return (
    <div className={cn('relative flex size-full items-center justify-center overflow-hidden', className)}>
      <div className="absolute bottom-[3%] h-[7%] w-[45%] rounded-full bg-slate-300/60 blur-[1px] motion-shadow" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/fitness-character/male-front.png"
        alt=""
        draggable={false}
        className={cn('character-preview relative z-10 h-[92%] w-auto max-w-[78%] select-none object-contain', motionClass)}
        data-exercise={slug}
      />
      <style>{`
        .character-preview {
          transform-origin: 50% 92%;
          will-change: transform;
        }
        .motion-shadow {
          animation: character-shadow 1.2s ease-in-out infinite;
        }
        .motion-idle { animation: character-idle 1.8s ease-in-out infinite; }
        .motion-squat { animation: character-squat 1.25s ease-in-out infinite; }
        .motion-push { animation: character-push 1.15s ease-in-out infinite; }
        .motion-bridge { animation: character-bridge 1.35s ease-in-out infinite; }
        .motion-balance { animation: character-balance 1.45s ease-in-out infinite; }
        .motion-march { animation: character-march 0.82s ease-in-out infinite; }
        .motion-side { animation: character-side 1.05s ease-in-out infinite; }
        .motion-lunge { animation: character-lunge 1.2s ease-in-out infinite; }
        .motion-step { animation: character-step 1s ease-in-out infinite; }
        .motion-plank { animation: character-plank 1.1s ease-in-out infinite; }
        .motion-climber { animation: character-climber 0.72s ease-in-out infinite; }
        .motion-burpee { animation: character-burpee 1.25s ease-in-out infinite; }
        .motion-core { animation: character-core 1s ease-in-out infinite; }

        @keyframes character-idle {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-3%) rotate(0.6deg); }
        }
        @keyframes character-squat {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(9%) scaleY(0.88) scaleX(1.05); }
        }
        @keyframes character-push {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          50% { transform: translateX(7%) rotate(-7deg); }
        }
        @keyframes character-bridge {
          0%, 100% { transform: translateY(3%) rotate(0deg) scaleY(0.96); }
          50% { transform: translateY(-5%) rotate(-3deg) scaleY(1.02); }
        }
        @keyframes character-balance {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-4%) rotate(-4deg); }
          75% { transform: translateX(4%) rotate(4deg); }
        }
        @keyframes character-march {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(-8%) rotate(1deg); }
        }
        @keyframes character-side {
          0%, 100% { transform: translateX(-8%) rotate(-1deg); }
          50% { transform: translateX(8%) rotate(1deg); }
        }
        @keyframes character-lunge {
          0%, 100% { transform: translateX(-3%) translateY(0) rotate(-2deg) scaleY(1); }
          50% { transform: translateX(5%) translateY(7%) rotate(3deg) scaleY(0.92); }
        }
        @keyframes character-step {
          0%, 100% { transform: translateY(2%) scaleY(0.98); }
          50% { transform: translateY(-9%) scaleY(1.02); }
        }
        @keyframes character-plank {
          0%, 100% { transform: translateY(2%) rotate(83deg) scale(0.92); }
          50% { transform: translateY(-2%) rotate(83deg) scale(0.95); }
        }
        @keyframes character-climber {
          0%, 100% { transform: translateX(-4%) rotate(72deg) scale(0.9); }
          50% { transform: translateX(4%) rotate(78deg) scale(0.92); }
        }
        @keyframes character-burpee {
          0%, 100% { transform: translateY(0) scaleY(1); }
          35% { transform: translateY(10%) scaleY(0.86) scaleX(1.08); }
          70% { transform: translateY(-10%) scaleY(1.04); }
        }
        @keyframes character-core {
          0%, 100% { transform: rotate(-70deg) translateX(-2%) scale(0.92); }
          50% { transform: rotate(-58deg) translateX(3%) scale(0.95); }
        }
        @keyframes character-shadow {
          0%, 100% { transform: scaleX(1); opacity: 0.65; }
          50% { transform: scaleX(0.82); opacity: 0.45; }
        }
        @media (prefers-reduced-motion: reduce) {
          .character-preview,
          .motion-shadow {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
