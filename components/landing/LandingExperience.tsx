'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Dumbbell, Droplets, Apple, NotebookPen, ArrowRight } from 'lucide-react'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

/* Warm landing — matches the app's cream + charcoal + ember serif language.
   A calm, light scroll (no dark deck): serif hero, glass discipline cards,
   a Day 01 → Day 75 journey band, and a closing call to begin. */

const MOVES = [
  { icon: Dumbbell, word: 'Move', tail: 'Workouts · indoor & out' },
  { icon: Droplets, word: 'Drink', tail: 'Water · by the liter' },
  { icon: Apple, word: 'Fuel', tail: 'Nutrition · made simple' },
  { icon: NotebookPen, word: 'Reflect', tail: 'Journal · every night' },
]

const JOURNEY = [
  { day: '01', title: 'Day one', body: 'Set your baseline — age, weight, goal — and start tracking.' },
  { day: '75', title: 'Day 75', body: 'Workouts, water, meals and journals — logged. See the change.' },
]

export function LandingExperience() {
  // Lightweight scroll-reveal — no heavy animation library.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.lh-reveal'))
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('lh-in'); io.unobserve(e.target) }
      }),
      { threshold: 0.16 },
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div className="lh-root">
      <style>{`
        .lh-root { position: relative; min-height: 100dvh; overflow-x: hidden; color: var(--foreground); }
        .lh-aurora { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
        .lh-inner { position: relative; z-index: 1; }

        /* Nav */
        .lh-nav {
          position: sticky; top: 0; z-index: 20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.1rem clamp(1.2rem, 5vw, 3.5rem);
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
        }
        .lh-brand {
          display: inline-flex; align-items: center; gap: 0.6rem;
          font-family: var(--font-geist-mono), ui-monospace, monospace;
          font-size: 0.7rem; letter-spacing: 0.26em; text-transform: uppercase; color: var(--foreground);
        }
        .lh-brand-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--brand); box-shadow: 0 0 10px var(--brand); }
        .lh-nav-right { display: flex; align-items: center; gap: 0.8rem; }
        .lh-signin { font-size: 0.86rem; font-weight: 600; color: var(--foreground); text-decoration: none; padding: 0.4rem 0.6rem; border-radius: 10px; }
        .lh-signin:hover { color: var(--brand); }

        /* Shared section rhythm */
        .lh-section { padding: clamp(3rem, 8vw, 6rem) clamp(1.3rem, 6vw, 4rem); max-width: 72rem; margin: 0 auto; }
        .lh-eyebrow {
          display: inline-flex; align-items: center; gap: 0.6rem;
          font-family: var(--font-geist-mono), ui-monospace, monospace;
          font-size: 0.66rem; letter-spacing: 0.28em; text-transform: uppercase; color: var(--brand);
          margin-bottom: 1.1rem;
        }
        .lh-eyebrow::before { content: ''; width: 1.8rem; height: 1px; background: var(--brand); opacity: 0.6; }

        /* Hero */
        .lh-hero { position: relative; min-height: 88vh; display: flex; flex-direction: column; justify-content: center; }
        .lh-ghost {
          position: absolute; right: -2vw; top: 50%; transform: translateY(-50%); z-index: -1;
          font-family: var(--font-fraunces), Georgia, serif; font-weight: 600; line-height: 0.7;
          font-size: clamp(16rem, 40vw, 34rem); color: var(--foreground); opacity: 0.04; user-select: none; pointer-events: none;
        }
        .lh-h1 {
          font-family: var(--font-fraunces), Georgia, serif; font-weight: 500;
          font-size: clamp(3rem, 9vw, 6.4rem); line-height: 0.98; letter-spacing: -0.03em;
          color: var(--foreground); margin: 0 0 1.6rem; max-width: 16ch;
        }
        .lh-em { font-style: italic; font-weight: 500; color: var(--brand); }
        .lh-lead { font-size: clamp(1.05rem, 1.7vw, 1.3rem); line-height: 1.6; color: var(--muted-foreground); max-width: 34rem; margin: 0 0 2.4rem; }
        .lh-actions { display: flex; flex-wrap: wrap; gap: 1rem; }

        /* Discipline cards */
        .lh-moves-head { margin-bottom: 2.4rem; }
        .lh-h2 {
          font-family: var(--font-fraunces), Georgia, serif; font-weight: 500;
          font-size: clamp(2rem, 5vw, 3.2rem); line-height: 1.04; letter-spacing: -0.02em; color: var(--foreground); margin: 0;
        }
        .lh-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.1rem; }
        @media (max-width: 780px) { .lh-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 440px) { .lh-grid { grid-template-columns: 1fr; } }
        .lh-card {
          padding: 1.5rem 1.3rem; border-radius: 24px;
          background: linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.66) 100%);
          backdrop-filter: blur(20px) saturate(1.4); -webkit-backdrop-filter: blur(20px) saturate(1.4);
          border: 1px solid rgba(255,255,255,0.7);
          box-shadow: 0 1px 0 0 rgba(255,255,255,0.6) inset, 0 18px 40px -22px rgba(45,49,66,0.28);
          transition: transform 0.35s cubic-bezier(0.34,1.4,0.5,1), box-shadow 0.35s ease;
        }
        .lh-card:hover { transform: translateY(-6px); box-shadow: 0 1px 0 0 rgba(255,255,255,0.7) inset, 0 28px 52px -22px rgba(45,49,66,0.32), 0 10px 24px -12px rgba(217,98,46,0.14); }
        .lh-card-ic {
          width: 2.9rem; height: 2.9rem; border-radius: 15px; display: grid; place-items: center; color: #fff; margin-bottom: 1rem;
          background: linear-gradient(135deg, var(--brand), var(--brand-soft)); box-shadow: 0 8px 18px -8px rgba(217,98,46,0.55);
        }
        .lh-card-word { font-family: var(--font-fraunces), Georgia, serif; font-weight: 600; font-size: 1.4rem; color: var(--foreground); }
        .lh-card-tail { font-size: 0.78rem; color: var(--muted-foreground); margin-top: 0.3rem; }

        /* Journey band */
        .lh-section--tight { padding-top: clamp(1.6rem, 4vw, 3rem); padding-bottom: clamp(1.6rem, 4vw, 3rem); }
        .lh-h2--sm { font-size: clamp(1.6rem, 4vw, 2.3rem); }
        .lh-journey { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.4rem; max-width: 42rem; }
        @media (max-width: 620px) { .lh-journey { grid-template-columns: 1fr; gap: 1rem; } }
        .lh-step { border-top: 2px solid var(--border); padding-top: 0.9rem; }
        .lh-step-day { font-family: var(--font-fraunces), Georgia, serif; font-weight: 700; font-size: 1.9rem; color: var(--brand); line-height: 1; }
        .lh-step-title { font-family: var(--font-fraunces), Georgia, serif; font-weight: 600; font-size: 1.05rem; margin: 0.4rem 0 0.3rem; color: var(--foreground); }
        .lh-step-body { font-size: 0.84rem; line-height: 1.5; color: var(--muted-foreground); margin: 0; }

        /* Closing CTA */
        .lh-cta { text-align: center; }
        .lh-cta .lh-actions { justify-content: center; }
        .lh-fine { margin-top: 1.6rem; font-family: var(--font-geist-mono), ui-monospace, monospace; font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted-foreground); }

        /* Footer */
        .lh-footer {
          border-top: 1px solid var(--border); padding: 1.6rem; text-align: center;
          display: flex; justify-content: center; gap: 0.55rem;
          font-family: var(--font-geist-mono), ui-monospace, monospace; font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted-foreground);
        }

        /* Scroll reveal */
        .lh-reveal { opacity: 0; transform: translateY(22px); transition: opacity 0.6s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1); }
        .lh-reveal.lh-in { opacity: 1; transform: none; }
        .lh-reveal.d1 { transition-delay: 0.08s; } .lh-reveal.d2 { transition-delay: 0.16s; }
        .lh-reveal.d3 { transition-delay: 0.24s; } .lh-reveal.d4 { transition-delay: 0.32s; }
        @media (prefers-reduced-motion: reduce) { .lh-reveal { opacity: 1; transform: none; } }
      `}</style>

      {/* Warm aurora — same living atmosphere the app uses */}
      <div className="lh-aurora app-aurora" aria-hidden>
        <span className="a1" /><span className="a2" /><span className="a3" />
      </div>

      <div className="lh-inner">
        <nav className="lh-nav">
          <span className="lh-brand"><span className="lh-brand-dot" />75 Days Lab</span>
          <span className="lh-nav-right">
            <Link href="/login" className="lh-signin">Sign in</Link>
            <ThemeToggle />
          </span>
        </nav>

        {/* Hero */}
        <header className="lh-section lh-hero">
          <span className="lh-ghost" aria-hidden>75</span>
          <span className="lh-eyebrow lh-reveal">The threshold · before day one</span>
          <h1 className="lh-h1 lh-reveal d1">It starts<br />in the <span className="lh-em">dark.</span></h1>
          <p className="lh-lead lh-reveal d2">
            75 days. One threshold. The version of you on the other side is already waiting —
            you just have to walk through it.
          </p>
          <div className="lh-actions lh-reveal d3">
            <Link href="/register" className="landing-btn-primary">Begin the crossing <ArrowRight size={18} style={{ marginLeft: 8 }} /></Link>
            <Link href="/login" className="landing-btn-ghost">Sign in</Link>
          </div>
        </header>

        {/* Disciplines */}
        <section className="lh-section">
          <div className="lh-moves-head">
            <span className="lh-eyebrow lh-reveal">The daily passage</span>
            <h2 className="lh-h2 lh-reveal d1">Four moves.<br />Every single day.</h2>
          </div>
          <div className="lh-grid">
            {MOVES.map((m, i) => {
              const Icon = m.icon
              return (
                <div key={m.word} className={`lh-card lh-reveal d${i + 1}`}>
                  <span className="lh-card-ic"><Icon size={20} strokeWidth={2.2} /></span>
                  <div className="lh-card-word">{m.word}</div>
                  <div className="lh-card-tail">{m.tail}</div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Journey */}
        <section className="lh-section lh-section--tight">
          <span className="lh-eyebrow lh-reveal">The 75 days</span>
          <h2 className="lh-h2 lh-h2--sm lh-reveal d1" style={{ marginBottom: '1.6rem' }}>From day one to day 75.</h2>
          <div className="lh-journey">
            {JOURNEY.map((s, i) => (
              <div key={s.title} className={`lh-step lh-reveal d${i + 1}`}>
                <div className="lh-step-day">{s.day}</div>
                <h3 className="lh-step-title">{s.title}</h3>
                <p className="lh-step-body">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="lh-section lh-cta">
          <span className="lh-eyebrow lh-reveal" style={{ justifyContent: 'center' }}>Daybreak</span>
          <h2 className="lh-h2 lh-reveal d1">Step into the <span className="lh-em">light.</span></h2>
          <div className="lh-actions lh-reveal d2" style={{ marginTop: '2rem' }}>
            <Link href="/register" className="landing-btn-primary">Start your 75 days <ArrowRight size={18} style={{ marginLeft: 8 }} /></Link>
            <Link href="/login" className="landing-btn-ghost">Sign in</Link>
          </div>
          <p className="lh-fine lh-reveal d3">Join thousands building unbreakable habits.</p>
        </section>

        <footer className="lh-footer">
          <span>75 Days Lab</span><span>·</span><span>cross the threshold</span>
        </footer>
      </div>
    </div>
  )
}
