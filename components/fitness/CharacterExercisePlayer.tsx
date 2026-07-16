'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { findExercise } from '@/lib/fitness/exerciseLottieRegistry'
import { cn } from '@/lib/utils'

const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

interface Props {
  slug: string
  className?: string
  autoplay?: boolean
}

type LottieColor = [number, number, number, number]
type LottieFill = { ty?: string; c?: { k?: LottieColor } }
type LottieLayer = { nm?: string; shapes?: unknown[] }
type LottieData = { layers?: LottieLayer[] }

const COLORS: Record<string, LottieColor> = {
  transparent: [1, 1, 1, 0],
  shadow: [0.65, 0.71, 0.78, 0.62],
  skin: [0.957, 0.627, 0.365, 1],
  shirt: [0.184, 0.204, 0.227, 1],
  shorts: [0.176, 0.714, 0.671, 1],
  hair: [0.08, 0.09, 0.1, 1],
  shoes: [0.96, 0.98, 1, 1],
}

function cloneLottie(data: object): LottieData {
  return JSON.parse(JSON.stringify(data)) as LottieData
}

function recolorFill(node: unknown, color: LottieColor) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach(child => recolorFill(child, color))
    return
  }
  const current = node as LottieFill & Record<string, unknown>
  if (current.ty === 'fl' && current.c) current.c.k = color
  Object.values(current).forEach(value => recolorFill(value, color))
}

function layerColor(name: string): LottieColor | null {
  if (name === 'BG') return COLORS.transparent
  if (name === 'Floor') return COLORS.shadow
  if (name.includes('Foot')) return COLORS.shoes
  if (name.includes('Thigh')) return COLORS.shorts
  if (name === 'Torso') return COLORS.shirt
  if (name === 'Hair') return COLORS.hair
  if (name.includes('Shin') || name.includes('Arm') || name.includes('Hand') || name === 'Head' || name === 'Neck') return COLORS.skin
  return null
}

function applyCharacterPalette(data: object) {
  const copy = cloneLottie(data)
  for (const layer of copy.layers ?? []) {
    const color = layerColor(layer.nm ?? '')
    if (color) recolorFill(layer.shapes, color)
  }
  return copy
}

export function CharacterExercisePlayer({ slug, className, autoplay = true }: Props) {
  const animationData = useMemo(() => {
    const animation = findExercise(slug, 'male')
    return animation ? applyCharacterPalette(animation.data) : null
  }, [slug])

  return (
    <div className={cn('relative flex size-full items-center justify-center overflow-hidden', className)}>
      {animationData && (
        <Lottie
          animationData={animationData}
          loop
          autoplay={autoplay}
          className="size-full"
          rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
        />
      )}
    </div>
  )
}
