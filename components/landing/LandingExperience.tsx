'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  useReducedMotion,
  type Variants,
} from 'framer-motion'
import { Dumbbell, Droplet, Salad, Brain, ArrowDown, ArrowRight } from 'lucide-react'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

/* Cinematic ease — "ease-out-expo". Slides settle like a PowerPoint reveal. */
const EXPO = [0.16, 1, 0.3, 1] as const

type SlideContent = {
  id: string
  src: string
  alt: string
  eyebrow: string
  title: React.ReactNode
  body: string
  align?: 'center' | 'left'
}

const DECK: SlideContent[] = [
  {
    id: 'hero',
    src: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c',
    alt: 'Runner at dawn',
    eyebrow: 'Your challenge awaits',
    title: (
      <>
        75 Days
        <br />
        <em className="le-em">of discipline.</em>
      </>
    ),
    body: 'Track your workouts, water, nutrition, and mindset — every single day.',
    align: 'center',
  },
  {
    id: 'day1',
    src: 'https://images.unsplash.com/photo-1502224562085-639556652f33',
    alt: 'Sunrise over mountains',
    eyebrow: 'Day 01',
    title: <>Everyone starts here.</>,
    body: 'One decision. A blank page. The version of you that quits has no idea what comes next.',
    align: 'left',
  },
  {
    id: 'grind',
    src: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438',
    alt: 'Lifting weights in a gym',
    eyebrow: 'The grind',
    title: <>Show up. Log it. Repeat.</>,
    body: 'Four things, done daily. The app keeps the score so you only have to keep the streak.',
    align: 'left',
  },
  {
    id: 'day75',
    src: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
    alt: 'Athlete mid-training',
    eyebrow: 'Day 75',
    title: <>Look who you became.</>,
    body: 'Stronger, sharper, unrecognizable from the person who pressed start. The habit is yours now.',
    align: 'left',
  },
  {
    id: 'proof',
    src: 'https://images.unsplash.com/photo-1486218119243-13883505764c',
    alt: 'The path ahead',
    eyebrow: 'The proof',
    title: <>Thousands are already in.</>,
    body: 'Join a community building unbreakable habits — one honest day at a time.',
    align: 'center',
  },
]

const PILLARS = [
  { icon: Dumbbell, label: 'Workouts', note: 'Indoor & outdoor, tracked daily' },
  { icon: Droplet, label: 'Water', note: 'Hit your liters, every day' },
  { icon: Salad, label: 'Nutrition', note: 'Macros & meals, made simple' },
  { icon: Brain, label: 'Mindset', note: 'Journal, reflect, stay sharp' },
]

export function LandingExperience() {
  const rootRef = useRef<HTMLDivElement>(null)
  const deckRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  /* Signature: a day counter that climbs 01 → 75 across the deck. */
  const { scrollYProgress } = useScroll({
    target: deckRef,
    container: rootRef,
    offset: ['start start', 'end end'],
  })
  const dayMV = useTransform(scrollYProgress, [0, 1], [1, 75])
  const counterOpacity = useTransform(scrollYProgress, [0.9, 1], [1, 0])
  const [day, setDay] = useState(1)
  useMotionValueEvent(dayMV, 'change', (v) => {
    const next = Math.min(75, Math.max(1, Math.round(v)))
    setDay(next)
  })

  return (
    <div ref={rootRef} className="le-root">
      {/* Fixed chrome */}
      <div className="le-chrome-right">
        <ThemeToggle />
      </div>
      <motion.div className="le-counter" style={{ opacity: reduce ? 1 : counterOpacity }} aria-hidden>
        <span className="le-counter-label">Day</span>
        <span className="le-counter-num">{String(day).padStart(2, '0')}</span>
        <span className="le-counter-total">/ 75</span>
      </motion.div>

      {/* ── Snap deck ───────────────────────────────────────── */}
      <div ref={deckRef}>
        {DECK.map((slide, i) => (
          <DeckSlide key={slide.id} slide={slide} index={i} reduce={!!reduce} />
        ))}
      </div>

      {/* ── Free-scroll: pillars ───────────────────────────── */}
      <section className="le-section le-pillars">
        <Reveal reduce={!!reduce}>
          <p className="le-eyebrow le-eyebrow--dark">What you track</p>
          <h2 className="le-h2">Four habits. One streak.</h2>
        </Reveal>
        <motion.div
          className="le-pillar-grid"
          variants={reduce ? undefined : staggerParent}
          initial={reduce ? undefined : 'hidden'}
          whileInView={reduce ? undefined : 'visible'}
          viewport={{ once: true, amount: 0.3 }}
        >
          {PILLARS.map((p) => (
            <motion.div key={p.label} className="le-pillar-card" variants={reduce ? undefined : childRise}>
              <p.icon className="le-pillar-icon" strokeWidth={1.5} aria-hidden />
              <h3 className="le-pillar-title">{p.label}</h3>
              <p className="le-pillar-note">{p.note}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Free-scroll: final CTA ─────────────────────────── */}
      <section className="le-section le-cta-block">
        <Reveal reduce={!!reduce}>
          <p className="le-eyebrow le-eyebrow--dark">75 days from now</p>
          <h2 className="le-h2 le-cta-title">
            The only question is<br />
            <em className="le-em">who you&rsquo;ll become.</em>
          </h2>
          <div className="le-cta-actions">
            <Link href="/register" className="landing-btn-primary">
              Start your challenge
            </Link>
            <Link href="/login" className="landing-btn-ghost">
              Sign in
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="le-footer">
        <span>75 Days Lab</span>
        <span className="le-footer-dot">·</span>
        <span>Build unbreakable habits</span>
      </footer>
    </div>
  )
}

/* ── Deck slide ──────────────────────────────────────────── */
function DeckSlide({ slide, index, reduce }: { slide: SlideContent; index: number; reduce: boolean }) {
  const isHero = slide.id === 'hero'
  return (
    <section className={`le-slide le-slide--${slide.align ?? 'center'}`}>
      {/* Photo layer with slow Ken Burns zoom */}
      <motion.div
        className="le-slide-photo"
        initial={reduce ? { scale: 1 } : { scale: 1.12 }}
        whileInView={reduce ? undefined : { scale: 1 }}
        viewport={{ once: false, amount: 0.4 }}
        transition={{ duration: 7, ease: 'linear' }}
      >
        <Image
          src={`${slide.src}?auto=format&fit=crop&w=1920&q=70`}
          alt={slide.alt}
          fill
          priority={isHero}
          sizes="100vw"
          className="le-img"
        />
      </motion.div>
      <div className="le-slide-scrim" aria-hidden />

      {/* Staggered PowerPoint-style content reveal */}
      <motion.div
        className="le-slide-content"
        variants={reduce ? undefined : staggerParent}
        initial={reduce ? undefined : 'hidden'}
        whileInView={reduce ? undefined : 'visible'}
        viewport={{ once: false, amount: 0.55 }}
      >
        <motion.p className="le-eyebrow" variants={reduce ? undefined : childRise}>
          {slide.eyebrow}
        </motion.p>
        <motion.h1 className={isHero ? 'le-h1' : 'le-h1 le-h1--slide'} variants={reduce ? undefined : childRise}>
          {slide.title}
        </motion.h1>
        <motion.p className="le-lead" variants={reduce ? undefined : childRise}>
          {slide.body}
        </motion.p>

        {isHero && (
          <motion.div className="le-hero-actions" variants={reduce ? undefined : childRise}>
            <Link href="/register" className="landing-btn-primary">
              Start your challenge
            </Link>
            <Link href="/login" className="landing-btn-ghost">
              Sign in
            </Link>
          </motion.div>
        )}

        {slide.id === 'grind' && (
          <motion.ul className="le-grind-list" variants={reduce ? undefined : childRise}>
            {PILLARS.map((p) => (
              <li key={p.label} className="le-grind-chip">
                <p.icon className="le-grind-icon" strokeWidth={1.5} aria-hidden />
                {p.label}
              </li>
            ))}
          </motion.ul>
        )}
      </motion.div>

      {isHero && (
        <motion.div
          className="le-scroll-cue"
          initial={{ opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { opacity: [0.3, 1, 0.3], y: [0, 8, 0] }}
          transition={reduce ? { duration: 0.3 } : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        >
          <ArrowDown size={20} strokeWidth={1.5} />
        </motion.div>
      )}

      {!isHero && index === DECK.length - 1 && (
        <ArrowRight className="le-slide-spacer" style={{ display: 'none' }} aria-hidden />
      )}
    </section>
  )
}

/* ── Reveal wrapper for free-scroll sections ─────────────── */
function Reveal({ children, reduce }: { children: React.ReactNode; reduce: boolean }) {
  if (reduce) return <div className="le-reveal-group">{children}</div>
  return (
    <motion.div
      className="le-reveal-group"
      variants={staggerParent}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
    >
      {Array.isArray(children) ? (
        children.map((c, i) => (
          <motion.div key={i} variants={childRise}>
            {c}
          </motion.div>
        ))
      ) : (
        <motion.div variants={childRise}>{children}</motion.div>
      )}
    </motion.div>
  )
}

/* ── Motion variants ─────────────────────────────────────── */
const staggerParent: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.05 } },
}
const childRise: Variants = {
  hidden: { opacity: 0, y: 42, filter: 'blur(8px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.9, ease: EXPO } },
}
