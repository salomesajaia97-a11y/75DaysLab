'use client'

/* eslint-disable @next/next/no-img-element -- Native GIFs must unmount when off-screen. */

import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  selectExerciseMedia,
  type ExerciseMediaSources,
  type SelectedExerciseMedia,
} from '@/lib/fitness/exerciseMedia'
import type { ExerciseFocus } from '@/lib/fitness/exerciseLottieRegistry'
import { LottiePlayer } from '@/components/ui/LottiePlayer'
import { ExerciseThumb } from './ExerciseThumb'

interface Props {
  media: ExerciseMediaSources
  alt: string
  focus: ExerciseFocus[]
  className?: string
  placeholderSize?: number
  aspectRatio?: `${number} / ${number}`
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return reduced
}

function visibleSelection(
  selected: SelectedExerciseMedia,
  reducedMotion: boolean,
  posterUrl?: string,
): SelectedExerciseMedia {
  if (!reducedMotion || selected.type === 'placeholder' || selected.type === 'poster') {
    return selected
  }
  return posterUrl ? { type: 'poster', url: posterUrl } : { type: 'placeholder' }
}

export function ExerciseMedia({
  media,
  alt,
  focus,
  className,
  placeholderSize = 48,
  aspectRatio = '1 / 1',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const reducedMotion = useReducedMotion()
  const selected = useMemo(() => selectExerciseMedia(media), [media])
  const active = visibleSelection(selected, reducedMotion, media.posterUrl)
  const mediaKey = active.type === 'placeholder' ? 'placeholder' : `${active.type}:${active.url}`

  useEffect(() => {
    const node = containerRef.current
    if (!node || !('IntersectionObserver' in window)) {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.01 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const loaded = loadedKey === mediaKey
  const failed = failedKey === mediaKey
  const shouldMount = visible && !failed && active.type !== 'placeholder'

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full overflow-hidden rounded-2xl bg-muted', className)}
      style={{ aspectRatio }}
      data-exercise-media={active.type}
      data-media-visible={visible}
    >
      <ExerciseThumb
        focus={focus}
        className="absolute inset-0 h-full w-full"
        size={placeholderSize}
      />

      {shouldMount && active.type === 'lottie' && (
        <LottiePlayer
          key={mediaKey}
          src={active.url}
          deferUntilVisible={false}
          className="absolute inset-0 h-full w-full [&_svg]:h-full [&_svg]:w-full"
        />
      )}

      {shouldMount && active.type === 'mp4' && (
        <video
          key={mediaKey}
          src={active.url}
          className="absolute inset-0 h-full w-full object-contain"
          aria-label={alt}
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
          onCanPlay={() => setLoadedKey(mediaKey)}
          onError={() => setFailedKey(mediaKey)}
        />
      )}

      {shouldMount && (active.type === 'gif' || active.type === 'poster') && (
        <img
          key={mediaKey}
          src={active.url}
          alt={alt}
          className={cn(
            'absolute inset-0 h-full w-full object-contain transition-opacity duration-200',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
          width={320}
          height={320}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoadedKey(mediaKey)}
          onError={() => setFailedKey(mediaKey)}
        />
      )}
    </div>
  )
}
