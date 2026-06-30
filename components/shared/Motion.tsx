'use client'

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  animate,
  type Variants,
} from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'

/* Shared motion primitives — bring the landing deck's cinematic reveals into
   the app. Sections rise + unblur in a staggered sequence on mount, like
   slides building. One import, every page gets the same high-quality feel. */

const EXPO = [0.16, 1, 0.3, 1] as const

const containerV: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
}

const itemV: Variants = {
  hidden: { opacity: 0, y: 26, filter: 'blur(8px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: EXPO } },
}

/** Staggers its direct <Reveal> children into view on mount. */
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div className={className} variants={containerV} initial="hidden" animate="visible">
      {children}
    </motion.div>
  )
}

/** A single staggered slide-in block. Use inside <Stagger>. */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div className={className} variants={itemV} style={{ willChange: 'transform, opacity, filter' }}>
      {children}
    </motion.div>
  )
}

/** Cinematic reveal that fires as the block scrolls into view — like a slide
    building when you reach it. Direction shifts the entrance. */
export function ScrollReveal({
  children, className, direction = 'up', delay = 0, amount = 0.06,
}: { children: ReactNode; className?: string; direction?: 'up' | 'left' | 'right'; delay?: number; amount?: number }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  const offset =
    direction === 'left' ? { x: -48, y: 0 } :
    direction === 'right' ? { x: 48, y: 0 } :
    { x: 0, y: 44 }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, filter: 'blur(10px)', ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.8, ease: EXPO, delay }}
      style={{ willChange: 'transform, opacity, filter' }}
    >
      {children}
    </motion.div>
  )
}

/** Ambient drifting aurora backdrop with scroll parallax — place once inside
    a relative container. Blobs keep their CSS drift; the layer shifts on scroll. */
export function Aurora() {
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 900], [0, 160])
  if (reduce) {
    return (
      <div className="app-aurora" aria-hidden>
        <span className="a1" /><span className="a2" /><span className="a3" />
      </div>
    )
  }
  return (
    <motion.div className="app-aurora" style={{ y }} aria-hidden>
      <span className="a1" /><span className="a2" /><span className="a3" />
    </motion.div>
  )
}

/** Counts a number up from 0 when it scrolls into view. */
export function CountUp({
  value, className, duration = 1.2,
}: { value: number; className?: string; duration?: number }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const mv = useMotionValue(0)
  const [display, setDisplay] = useState(0)

  useMotionValueEvent(mv, 'change', (v) => setDisplay(Math.round(v)))

  useEffect(() => {
    if (reduce || !inView) return
    const controls = animate(mv, value, { duration, ease: [0.16, 1, 0.3, 1] })
    return controls.stop
  }, [inView, value, duration, reduce, mv])

  return <span ref={ref} className={className}>{reduce ? value : display}</span>
}

/** 3D tilt that follows the pointer — adds depth to cards/tiles on hover. */
export function Tilt({
  children, className, max = 12,
}: { children: ReactNode; className?: string; max?: number }) {
  const reduce = useReducedMotion()
  const rx = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 })
  const ry = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 })

  if (reduce) return <div className={className}>{children}</div>

  function handleMove(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    ry.set(px * max)
    rx.set(-py * max)
  }
  function reset() { rx.set(0); ry.set(0) }

  return (
    <motion.div
      className={className}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 800, transformStyle: 'preserve-3d' }}
    >
      {children}
    </motion.div>
  )
}

/** Springy pop-in for accent tiles (stats, badges). */
export function Pop({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.86, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.34, 1.4, 0.5, 1], delay }}
      style={{ willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  )
}
