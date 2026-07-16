'use client'

import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  getCharacterAnimation,
  type CharacterAnimationBundle,
  type CharacterFrame,
} from '@/lib/fitness/characterAnimationRegistry'

const STACK = [
  'Torso Back', 'Thigh R', 'Calf R', 'Foot R', 'Thigh L', 'Calf L', 'Foot L',
  'Shorts', 'Torso Front', 'Upper Arm R', 'Forearm R', 'Hand R',
  'Upper Arm L', 'Forearm L', 'Hand L', 'Neck', 'Head', 'Hair',
]

const STAGE = { width: 360, height: 620, pelvis: [180, 300] as const }
const ARTBOARD = { width: 1156, height: 1361 }

interface Props {
  slug: string
  className?: string
  autoplay?: boolean
}

type RigNode = { el: SVGGElement | null; x: number; y: number }

function byPart<T extends { part: string }>(items: T[]) {
  return Object.fromEntries(items.map(item => [item.part, item])) as Record<string, T>
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function sample(frames: CharacterFrame[], progress: number) {
  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i]
    const b = frames[i + 1]
    if (progress >= a.time && progress <= b.time) {
      return { a, b, t: (progress - a.time) / (b.time - a.time) }
    }
  }
  return { a: frames[0], b: frames[0], t: 0 }
}

function transform(x: number, y: number, rotation = 0) {
  return `translate(${x} ${y}) rotate(${rotation})`
}

export function CharacterExercisePlayer({ slug, className, autoplay = true }: Props) {
  const bundle = useMemo<CharacterAnimationBundle | null>(() => getCharacterAnimation(slug), [slug])
  const pelvisRef = useRef<SVGGElement | null>(null)
  const nodesRef = useRef<Record<string, RigNode>>({})
  const frameRef = useRef<number | null>(null)
  const startedRef = useRef(0)

  const rig = useMemo(() => {
    if (!bundle) return null
    const assemblies = Array.isArray(bundle.rig.assembly) ? bundle.rig.assembly : bundle.rig.assembly.parts
    const pivots = Array.isArray(bundle.rig.pivots) ? bundle.rig.pivots : bundle.rig.pivots.parts
    const assemblyByPart = byPart(assemblies)
    const pivotByPart = byPart(pivots)
    const assetByPart = byPart(bundle.rig.artParts)
    const childrenByParent: Record<string, string[]> = { Pelvis: [] }
    for (const part of STACK) childrenByParent[part] = []
    for (const item of assemblies) {
      if (!childrenByParent[item.parent]) childrenByParent[item.parent] = []
      childrenByParent[item.parent].push(item.part)
    }
    for (const parent of Object.keys(childrenByParent)) {
      childrenByParent[parent].sort((a, b) => STACK.indexOf(a) - STACK.indexOf(b))
    }
    return { assemblyByPart, pivotByPart, assetByPart, childrenByParent }
  }, [bundle])

  useEffect(() => {
    if (!bundle || !autoplay) return
    const pelvis = pelvisRef.current
    if (!pelvis) return
    const frames = bundle.template.keyframes
    startedRef.current = performance.now()

    const tick = (now: number) => {
      const duration = bundle.template.duration || 1000
      const progress = ((now - startedRef.current) % duration) / duration
      const { a, b, t } = sample(frames, progress)
      pelvis.setAttribute('transform', transform(lerp(a.pelvis.x, b.pelvis.x, t), lerp(a.pelvis.y, b.pelvis.y, t)))
      for (const part of STACK) {
        const node = nodesRef.current[part]
        if (node?.el) {
          node.el.setAttribute('transform', transform(node.x, node.y, lerp(a.rotation[part] || 0, b.rotation[part] || 0, t)))
        }
      }
      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [bundle, autoplay])

  const renderPart = (part: string): ReactNode => {
    if (!rig) return null
    const assembly = rig.assemblyByPart[part]
    const pivot = rig.pivotByPart[part]
    const asset = rig.assetByPart[part]
    if (!assembly || !pivot || !asset) return null
    const parentJoint = assembly.parent === 'Pelvis'
      ? STAGE.pelvis
      : rig.assemblyByPart[assembly.parent]?.joint_xy ?? STAGE.pelvis
    const x = assembly.joint_xy[0] - parentJoint[0]
    const y = assembly.joint_xy[1] - parentJoint[1]

    return (
      <g
        key={part}
        ref={node => { nodesRef.current[part] = { el: node, x, y } }}
        transform={transform(x, y)}
      >
        <image
          href={asset.svg}
          x={-pivot.pivotX}
          y={-pivot.pivotY}
          width={ARTBOARD.width}
          height={ARTBOARD.height}
          preserveAspectRatio="xMinYMin meet"
        />
        {rig.childrenByParent[part]?.map(renderPart)}
      </g>
    )
  }

  return (
    <div className={cn('relative flex size-full items-center justify-center overflow-hidden', className)}>
      {bundle && rig && (
        <svg
          viewBox={`0 40 ${STAGE.width} 560`}
          className="block size-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${slug} character animation`}
        >
          <ellipse cx="180" cy="586" rx="118" ry="12" fill="rgb(203 213 225 / 0.7)" />
          <g ref={pelvisRef} transform={transform(STAGE.pelvis[0], STAGE.pelvis[1])}>
            {rig.childrenByParent.Pelvis.map(renderPart)}
          </g>
        </svg>
      )}
    </div>
  )
}
