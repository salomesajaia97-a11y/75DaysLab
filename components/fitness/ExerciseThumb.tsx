'use client'
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { LottieRefCurrentProps } from 'lottie-react'
import { PersonStanding, Target, Dumbbell, Footprints, HeartPulse, Flower2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExerciseFocus } from '@/lib/fitness/exerciseLottieRegistry'
import type { ExerciseMedia } from '@/lib/fitness/exerciseMedia'

const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

// Pastel illustration tile. Renders exercise media (GIF or Lottie) when
// provided — lazy-loaded, paused off-screen for Lottie, disabled under
// reduced-motion — otherwise a focus-matched icon fallback.
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
  /** Resolved exercise media (GIF or Lottie). Undefined → icon fallback. */
  media?: ExerciseMedia | null
  /** @deprecated pass `media` instead. Kept for icon-only call sites. */
  lottieSrc?: string | null
  className?: string
  /** fallback-icon size in px */
  size?: number
}

export function ExerciseThumb({ focus, media, lottieSrc, className, size = 40 }: Props) {
  const key = focus[0] ?? 'full'
  const style = FOCUS_STYLE[key] ?? FOCUS_STYLE.full
  const Icon = style.icon

  const gifSrc = media?.kind === 'gif' ? media.src : null
  const effLottieSrc = media?.kind === 'lottie' ? media.src : lottieSrc ?? null

  const [data, setData] = useState<object | null>(null)
  const [inView, setInView] = useState(false)
  const [reduced, setReduced] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const lottieRef = useRef<LottieRefCurrentProps | null>(null)
  const fetchedRef = useRef(false)

  // Respect the user's reduced-motion preference.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // A looping GIF can't be paused, so under reduced-motion we drop to the icon.
  const showGif = !!gifSrc && !reduced
  const showLottie = !showGif && !!effLottieSrc && !reduced

  // Lazy-load on first view; toggle in-view for play/pause.
  useEffect(() => {
    if (!showLottie) return
    const el = containerRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
        if (entry.isIntersecting && !fetchedRef.current && effLottieSrc) {
          fetchedRef.current = true
          fetch(effLottieSrc)
            .then(r => r.json())
            .then(setData)
            .catch(() => { /* keep icon fallback on failure */ })
        }
      },
      { threshold: 0.1 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [showLottie, effLottieSrc])

  // Pause animation while off-screen to save CPU.
  useEffect(() => {
    const l = lottieRef.current
    if (!l) return
    if (inView) l.play()
    else l.pause()
  }, [inView, data])

  return (
    <div
      ref={containerRef}
      className={cn('relative flex items-center justify-center overflow-hidden', className)}
      style={{ background: style.grad }}
    >
      {showGif ? (
        // eslint-disable-next-line @next/next/no-img-element -- animated GIF; next/image can't loop it
        <img
          src={gifSrc!}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain"
        />
      ) : showLottie && data ? (
        <Lottie lottieRef={lottieRef} animationData={data} loop autoplay className="h-full w-full" />
      ) : (
        <Icon style={{ width: size, height: size, color: style.fg }} strokeWidth={1.5} />
      )}
    </div>
  )
}
