'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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

const DEFAULT_STAGE = { width: 360, height: 620, pelvis: [180, 300] as const }

interface Props {
  slug: string
  className?: string
  autoplay?: boolean
  fit?: boolean
}

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

export function CharacterExercisePlayer({ slug, className, autoplay = true, fit = true }: Props) {
  const bundle = useMemo<CharacterAnimationBundle | null>(() => getCharacterAnimation(slug), [slug])
  const [scale, setScale] = useState(1)
  const rootRef = useRef<HTMLDivElement>(null)
  const pelvisRef = useRef<HTMLDivElement>(null)
  const nodesRef = useRef<Record<string, HTMLDivElement | null>>({})
  const frameRef = useRef<number | null>(null)
  const startedRef = useRef(0)


  useEffect(() => {
    if (!fit) return
    const el = rootRef.current
    if (!el) return
    let frame = 0
    const update = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        const next = Math.min(rect.width / DEFAULT_STAGE.width, rect.height / DEFAULT_STAGE.height)
        setScale(Number.isFinite(next) && next > 0 ? next : 1)
      })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [fit])

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
      pelvis.style.left = `${lerp(a.pelvis.x, b.pelvis.x, t)}px`
      pelvis.style.top = `${lerp(a.pelvis.y, b.pelvis.y, t)}px`
      for (const part of STACK) {
        const node = nodesRef.current[part]
        if (node) node.style.transform = `rotate(${lerp(a.rotation[part] || 0, b.rotation[part] || 0, t)}deg)`
      }
      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [bundle, autoplay])

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


  const renderPart = (part: string): ReactNode => {
    if (!rig) return null
    const assembly = rig.assemblyByPart[part]
    const pivot = rig.pivotByPart[part]
    const asset = rig.assetByPart[part]
    if (!assembly || !pivot || !asset) return null
    const parentJoint = assembly.parent === 'Pelvis'
      ? DEFAULT_STAGE.pelvis
      : rig.assemblyByPart[assembly.parent]?.joint_xy ?? DEFAULT_STAGE.pelvis

    return (
      <div
        key={part}
        ref={node => { nodesRef.current[part] = node }}
        className="absolute size-0 [transform-style:preserve-3d]"
        style={{ left: assembly.joint_xy[0] - parentJoint[0], top: assembly.joint_xy[1] - parentJoint[1] }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.svg}
          alt=""
          draggable={false}
          className="pointer-events-none absolute h-[1361px] w-[1156px] select-none"
          style={{ left: -pivot.pivotX, top: -pivot.pivotY }}
        />
        {rig.childrenByParent[part]?.map(renderPart)}
      </div>
    )
  }

  return (
    <div ref={rootRef} className={cn('relative grid size-full place-items-center overflow-hidden', className)}>
      {bundle && rig && (
        <div
          className="relative h-[620px] w-[360px] origin-center"
          style={{ transform: `scale(${scale})` }}
          aria-label={`${slug} character animation`}
        >
          <div className="absolute bottom-6 left-12 right-12 h-4 rounded-full bg-slate-300/70" />
          <div
            ref={pelvisRef}
            className="absolute size-0 [transform-style:preserve-3d]"
            style={{ left: DEFAULT_STAGE.pelvis[0], top: DEFAULT_STAGE.pelvis[1] }}
          >
            {rig.childrenByParent.Pelvis.map(renderPart)}
          </div>
        </div>
      )}
    </div>
  )
}
