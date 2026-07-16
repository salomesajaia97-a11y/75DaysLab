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

type RgbColor = [number, number, number]
type LottieFill = { ty?: string; c?: { k?: RgbColor | number[] }; o?: { k?: number } }
type LottieLayer = { nm?: string; shapes?: unknown[] }
type LottieData = { layers?: LottieLayer[] }
type PaletteColor = { rgb: RgbColor; opacity?: number }

const COLORS: Record<string, PaletteColor> = {
  shadow: { rgb: [0.65, 0.71, 0.78], opacity: 62 },
  skin: { rgb: [0.957, 0.627, 0.365] },
  shirt: { rgb: [0.184, 0.204, 0.227] },
  shorts: { rgb: [0.176, 0.714, 0.671] },
  hair: { rgb: [0.08, 0.09, 0.1] },
  shoes: { rgb: [0.96, 0.98, 1] },
}

function cloneLottie(data: object): LottieData {
  return JSON.parse(JSON.stringify(data)) as LottieData
}

function recolorFill(node: unknown, color: PaletteColor) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach(child => recolorFill(child, color))
    return
  }
  const current = node as LottieFill & Record<string, unknown>
  if (current.ty === 'fl' && current.c) {
    current.c.k = color.rgb
    if (current.o && typeof color.opacity === 'number') current.o.k = color.opacity
  }
  Object.values(current).forEach(value => recolorFill(value, color))
}

function layerColor(name: string): PaletteColor | null {
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
  copy.layers = (copy.layers ?? []).filter(layer => layer.nm !== 'BG')
  for (const layer of copy.layers) {
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
