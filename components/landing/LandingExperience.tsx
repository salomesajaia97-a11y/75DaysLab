'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  useReducedMotion,
  type MotionValue,
  type Variants,
} from 'framer-motion'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

/* "Threshold — a training almanac" : 75 days as a scroll-driven slide deck.
   Editorial dossier look — high-contrast Fraunces serif against mono utility
   type, oversized ghost numerals, a vertical spine, registration ticks.
   Each section is a full-viewport slide that SNAPS like PowerPoint; arrow
   keys / Space advance, nav dots jump. The world brightens from pre-dawn
   void to blinding daybreak as you advance. No photos — pure light + type. */

const EXPO = [0.16, 1, 0.3, 1] as const

const SLIDES = [
  { id: 'threshold', label: 'Before' },
  { id: 'ignition', label: 'Day 01' },
  { id: 'passage', label: 'Daily' },
  { id: 'summit', label: 'Day 75' },
  { id: 'daybreak', label: 'Begin' },
] as const

export function LandingExperience() {
  const rootRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLElement | null)[]>([])
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ container: rootRef })
  const [active, setActive] = useState(0)

  /* Track which slide fills the viewport (deck "current slide") */
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const i = Number((e.target as HTMLElement).dataset.index)
            if (!Number.isNaN(i)) setActive(i)
          }
        }
      },
      { root, threshold: 0.55 },
    )
    slideRefs.current.forEach((s) => s && io.observe(s))
    return () => io.disconnect()
  }, [])

  const goTo = useCallback((i: number) => {
    const target = slideRefs.current[Math.max(0, Math.min(SLIDES.length - 1, i))]
    target?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
  }, [reduce])

  /* PowerPoint-style keyboard advance */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault(); goTo(active + 1)
      } else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) {
        e.preventDefault(); goTo(active - 1)
      } else if (e.key === 'Home') {
        e.preventDefault(); goTo(0)
      } else if (e.key === 'End') {
        e.preventDefault(); goTo(SLIDES.length - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, goTo])

  const setRef = (i: number) => (el: HTMLElement | null) => { slideRefs.current[i] = el }

  return (
    <div ref={rootRef} className="th-root">
      <Atmosphere progress={scrollYProgress} reduce={!!reduce} />
      <ProgressRail progress={scrollYProgress} reduce={!!reduce} />

      {/* Deck chrome */}
      <div className="th-wordmark" aria-hidden>
        <span className="th-wordmark-dot" />75 Days Lab
      </div>
      <span className="th-spine" aria-hidden>Laboratory of the self · Threshold</span>
      <DayMarker progress={scrollYProgress} reduce={!!reduce} />
      <SlideCounter active={active} total={SLIDES.length} />
      <NavDots active={active} goTo={goTo} />
      <div className="th-toggle"><ThemeToggle /></div>

      {/* Registration ticks — frame the stage like a printed plate */}
      <div className="th-frame" aria-hidden>
        <span className="th-tick th-tick--tl" /><span className="th-tick th-tick--tr" />
        <span className="th-tick th-tick--bl" /><span className="th-tick th-tick--br" />
      </div>

      <main className="th-deck">
        {/* 1 — Threshold (title slide) */}
        <section ref={setRef(0)} data-index={0} className="th-slide th-slide--dark th-hero">
          <span className="th-ghost" aria-hidden>00</span>
          <Build reduce={!!reduce}>
            <span className="th-eyebrow">The threshold · before day one</span>
            <h1 className="th-mega">
              It starts<br />in the <em className="th-em">dark.</em>
            </h1>
            <p className="th-lead">
              75 days. One threshold. The version of you on the other side is already waiting —
              you just have to walk through it.
            </p>
            <div className="th-actions">
              <Link href="/register" className="th-btn th-btn--solid">Begin the crossing</Link>
              <Link href="/login" className="th-btn th-btn--line">Sign in</Link>
            </div>
          </Build>
          {!reduce && <ScrollCue />}
        </section>

        {/* 2 — Ignition */}
        <section ref={setRef(1)} data-index={1} className="th-slide th-slide--dark th-center">
          <span className="th-ghost th-ghost--left" aria-hidden>01</span>
          <Build reduce={!!reduce}>
            <span className="th-eyebrow">Day 01 · Ignition</span>
            <h2 className="th-big">Everyone begins<br />before the <em className="th-em">light</em> does.</h2>
            <p className="th-lead th-lead--mid">
              No streak, no proof, no momentum. Just one honest decision, made in the dark,
              that the next 75 days are yours.
            </p>
          </Build>
        </section>

        {/* 3 — The daily passage: four disciplines as an editorial index */}
        <section ref={setRef(2)} data-index={2} className="th-slide th-slide--warm th-passage">
          <span className="th-ghost" aria-hidden>·</span>
          <Build reduce={!!reduce} className="th-passage-head">
            <span className="th-eyebrow th-eyebrow--warm">The daily passage</span>
            <h2 className="th-big th-big--warm">Four moves.<br />Every single day.</h2>
          </Build>
          <ul className="th-disc">
            {[
              { n: '01', word: 'Move', tail: 'Workouts · indoor & out' },
              { n: '02', word: 'Drink', tail: 'Water · by the liter' },
              { n: '03', word: 'Fuel', tail: 'Nutrition · made simple' },
              { n: '04', word: 'Reflect', tail: 'Journal · every night' },
            ].map((d, i) => (
              <DiscLine key={d.word} {...d} index={i} reduce={!!reduce} />
            ))}
          </ul>
        </section>

        {/* 4 — Summit */}
        <section ref={setRef(3)} data-index={3} className="th-slide th-slide--bright th-center">
          <span className="th-ghost" aria-hidden>75</span>
          <Build reduce={!!reduce}>
            <span className="th-eyebrow th-eyebrow--ink">Day 75 · Summit</span>
            <h2 className="th-big th-big--ink">You crossed <em className="th-em">over.</em></h2>
            <p className="th-lead th-lead--ink th-lead--mid">
              Stronger, sharper, unrecognizable from the person who stepped off in the dark.
              The discipline isn&rsquo;t a challenge anymore. It&rsquo;s just who you are.
            </p>
          </Build>
        </section>

        {/* 5 — Daybreak / CTA */}
        <section ref={setRef(4)} data-index={4} className="th-slide th-slide--day th-center th-cta">
          <Build reduce={!!reduce}>
            <span className="th-eyebrow th-eyebrow--ink">Daybreak</span>
            <h2 className="th-mega th-mega--ink">Step into<br />the <em className="th-em">light.</em></h2>
            <div className="th-actions th-actions--center">
              <Link href="/register" className="th-btn th-btn--day">Start your 75 days</Link>
              <Link href="/login" className="th-btn th-btn--ink-line">Sign in</Link>
            </div>
            <p className="th-fine">Join thousands building unbreakable habits.</p>
          </Build>
          <footer className="th-footer">
            <span>75 Days Lab</span><span className="th-dot">·</span><span>cross the threshold</span>
          </footer>
        </section>
      </main>
    </div>
  )
}

/* ── Atmosphere: stacked gradient layers + rising sun, driven by scroll ── */
function Atmosphere({ progress, reduce }: { progress: MotionValue<number>; reduce: boolean }) {
  const indigo = useTransform(progress, [0, 0.22, 0.4], [1, 0.7, 0])
  const ember = useTransform(progress, [0.18, 0.42, 0.62], [0, 1, 0.15])
  const gold = useTransform(progress, [0.45, 0.68, 0.85], [0, 1, 0.4])
  const day = useTransform(progress, [0.72, 0.9, 1], [0, 0.85, 1])

  const sunY = useTransform(progress, [0, 1], ['18vh', '-46vh'])
  const sunScale = useTransform(progress, [0, 0.6, 1], [0.85, 1.7, 3.4])
  const sunOpacity = useTransform(progress, [0, 0.12, 0.85, 1], [0.5, 0.95, 1, 0.6])

  if (reduce) {
    return (
      <div className="th-atmo" aria-hidden>
        <div className="th-layer th-layer--static" />
      </div>
    )
  }

  return (
    <div className="th-atmo" aria-hidden>
      <div className="th-layer th-layer--void" />
      <motion.div className="th-layer th-layer--indigo" style={{ opacity: indigo }} />
      <motion.div className="th-layer th-layer--ember" style={{ opacity: ember }} />
      <motion.div className="th-layer th-layer--gold" style={{ opacity: gold }} />
      <motion.div className="th-layer th-layer--day" style={{ opacity: day }} />
      <motion.div
        className="th-sun"
        style={{ y: sunY, scale: sunScale, opacity: sunOpacity }}
      />
      <Particles />
      <div className="th-grain" />
    </div>
  )
}

function Particles() {
  const dots = [
    { l: '12%', t: '24%', s: 5, d: '0s', dur: '13s' },
    { l: '78%', t: '18%', s: 3, d: '2s', dur: '17s' },
    { l: '64%', t: '62%', s: 6, d: '1s', dur: '15s' },
    { l: '30%', t: '70%', s: 4, d: '3s', dur: '19s' },
    { l: '88%', t: '48%', s: 3, d: '1.5s', dur: '14s' },
    { l: '46%', t: '34%', s: 2, d: '0.5s', dur: '21s' },
  ]
  return (
    <div className="th-particles">
      {dots.map((p, i) => (
        <span
          key={i}
          className="th-particle"
          style={{
            left: p.l, top: p.t, width: p.s, height: p.s,
            animationDelay: p.d, animationDuration: p.dur,
          }}
        />
      ))}
    </div>
  )
}

/* ── Top progress rail: a daybreak meter that fills as you descend ── */
function ProgressRail({ progress, reduce }: { progress: MotionValue<number>; reduce: boolean }) {
  const scaleX = useTransform(progress, [0, 1], [0, 1])
  return (
    <div className="th-rail" aria-hidden>
      <motion.div className="th-rail-fill" style={{ scaleX: reduce ? 1 : scaleX }} />
    </div>
  )
}

/* ── Day marker that climbs 01 → 75 (bottom-right) ── */
function DayMarker({ progress, reduce }: { progress: MotionValue<number>; reduce: boolean }) {
  const dayMV = useTransform(progress, [0, 1], [1, 75])
  const [day, setDay] = useState(1)
  useMotionValueEvent(dayMV, 'change', (v) => setDay(Math.min(75, Math.max(1, Math.round(v)))))
  return (
    <div className="th-marker" aria-hidden>
      <span className="th-marker-lab">Day</span>
      <span className="th-marker-num">{String(reduce ? 1 : day).padStart(2, '0')}</span>
      <span className="th-marker-sep">/</span>
      <span className="th-marker-total">75</span>
    </div>
  )
}

/* ── Slide counter: which deck slide is current (bottom-left) ── */
function SlideCounter({ active, total }: { active: number; total: number }) {
  return (
    <div className="th-count" aria-hidden>
      <span className="th-count-cur">{String(active + 1).padStart(2, '0')}</span>
      <span className="th-count-sep">—</span>
      <span className="th-count-total">{String(total).padStart(2, '0')}</span>
    </div>
  )
}

/* ── Right-rail nav dots: jump to any slide, like a deck overview ── */
function NavDots({ active, goTo }: { active: number; goTo: (i: number) => void }) {
  return (
    <nav className="th-dots" aria-label="Slides">
      {SLIDES.map((s, i) => (
        <button
          key={s.id}
          type="button"
          className={`th-dot-btn${i === active ? ' is-active' : ''}`}
          onClick={() => goTo(i)}
          aria-label={`Go to slide ${i + 1}: ${s.label}`}
          aria-current={i === active}
        >
          <span className="th-dot-mark" />
          <span className="th-dot-label">{s.label}</span>
        </button>
      ))}
    </nav>
  )
}

/* ── Build: stagger children with a clip-wipe + rise on slide entry ── */
function Build({
  children, reduce, className,
}: { children: React.ReactNode; reduce: boolean; className?: string }) {
  if (reduce) return <div className={`th-build${className ? ' ' + className : ''}`}>{children}</div>
  const items = Array.isArray(children) ? children : [children]
  return (
    <motion.div
      className={`th-build${className ? ' ' + className : ''}`}
      variants={parent}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.5 }}
    >
      {items.map((c, i) => (
        <motion.div key={i} variants={rise} className="th-build-item">
          {c}
        </motion.div>
      ))}
    </motion.div>
  )
}

function DiscLine({
  n, word, tail, index, reduce,
}: { n: string; word: string; tail: string; index: number; reduce: boolean }) {
  return (
    <motion.li
      className="th-disc-line"
      initial={reduce ? false : { opacity: 0, x: -60, filter: 'blur(8px)' }}
      whileInView={reduce ? undefined : { opacity: 1, x: 0, filter: 'blur(0px)' }}
      viewport={{ once: false, amount: 0.8 }}
      transition={{ duration: 0.7, ease: EXPO, delay: index * 0.1 }}
    >
      <span className="th-disc-n">{n}</span>
      <span className="th-disc-word">{word}</span>
      <span className="th-disc-tail">{tail}</span>
    </motion.li>
  )
}

function ScrollCue() {
  return (
    <motion.div
      className="th-cue"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0.25, 0.9, 0.25], y: [0, 9, 0] }}
      transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden
    >
      <span className="th-cue-word">advance</span>
      <span className="th-cue-line" />
    </motion.div>
  )
}

const parent: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: 0.05 } },
}
/* clip-wipe reveal: content wipes up into view, blurred rise underneath */
const rise: Variants = {
  hidden: { opacity: 0, y: 40, filter: 'blur(10px)', clipPath: 'inset(0 0 100% 0)' },
  visible: {
    opacity: 1, y: 0, filter: 'blur(0px)', clipPath: 'inset(0 0 0% 0)',
    transition: { duration: 0.9, ease: EXPO },
  },
}
