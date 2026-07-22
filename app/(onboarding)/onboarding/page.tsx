'use client'
import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Check, ArrowRight, ArrowLeft, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n'
import { saveProfile } from '@/lib/storage'
import { ALLOWED_CHALLENGE_LENGTHS } from '@/lib/validation/challenge'
import type { Goal, FocusArea, Gender } from '@/types'

// One question per screen — mirrors the reference flow, skinned in the
// 75DaysLab warm/cream + charcoal + ember serif language (see globals.css).
type Step = 'gender' | 'age' | 'height' | 'weight' | 'goal' | 'focus' | 'timeline'

interface OnboardingData {
  age: string
  gender: Gender | ''
  heightCm: string
  weightKg: string
  goal: Goal | ''
  focusArea: FocusArea | ''
  totalDays: string
  startDate: string
}

const STEPS: Step[] = ['gender', 'age', 'height', 'weight', 'goal', 'focus', 'timeline']

const AGE = { min: 13, max: 100, def: 25 }
const HEIGHT = { min: 120, max: 220, def: 170 } // cm (canonical)
const WEIGHT = { min: 30, max: 200, def: 70 } // kg (canonical)

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

function cmToFt(cm: number): string {
  const totalIn = cm / 2.54
  let ft = Math.floor(totalIn / 12)
  let inch = Math.round(totalIn - ft * 12)
  if (inch === 12) { ft += 1; inch = 0 }
  return `${ft}′${inch}″`
}
const kgToLb = (kg: number) => Math.round(kg * 2.2046226)

// ── "Behind the question" — ember-tinted tip card, expandable ──
function WhyChip({ label, text, moreLabel, lessLabel, open, onToggle }: {
  label: string; text: string; moreLabel: string; lessLabel: string
  open: boolean; onToggle: () => void
}) {
  const CUT = 62
  const long = text.length > CUT
  const shown = open || !long ? text : text.slice(0, CUT).trimEnd() + '…'
  return (
    <div className="ob-why">
      <span className="ob-why-ic" aria-hidden><Info size={16} strokeWidth={2.4} /></span>
      <div className="ob-why-body">
        <span className="ob-why-lab">{label}</span>
        <p className="ob-why-txt">
          {shown}
          {long && (
            <button type="button" className="ob-why-more" onClick={onToggle}>
              {open ? lessLabel : moreLabel}
            </button>
          )}
        </p>
      </div>
    </div>
  )
}

// ── Age — vertical snap wheel (scroll / drag / click / arrows) ──
const ITEM_H = 58
function AgeWheel({ value, min, max, onChange, ariaLabel }: {
  value: number; min: number; max: number; onChange: (v: number) => void; ariaLabel: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const raf = useRef<number>(0)
  const items: number[] = []
  for (let v = min; v <= max; v++) items.push(v)

  useEffect(() => {
    const el = ref.current
    if (el) el.scrollTop = (value - min) * ITEM_H
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onScroll = useCallback(() => {
    const el = ref.current
    if (!el) return
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      const v = clamp(min + Math.round(el.scrollTop / ITEM_H), min, max)
      if (v !== value) onChange(v)
    })
  }, [value, min, max, onChange])

  return (
    <div className="ob-wheel-wrap">
      <span className="ob-wheel-hl" aria-hidden />
      <span className="ob-wheel-caret" aria-hidden>
        <svg viewBox="0 0 16 18">
          <polygon points="12,3 4,9 12,15" fill="var(--foreground)" stroke="var(--foreground)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </span>
      <span className="ob-wheel-fade ob-wheel-fade-t" aria-hidden />
      <span className="ob-wheel-fade ob-wheel-fade-b" aria-hidden />
      <div
        ref={ref}
        className="ob-wheel"
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onScroll={onScroll}
        onKeyDown={e => {
          const el = ref.current
          if (!el) return
          if (e.key === 'ArrowDown') { e.preventDefault(); el.scrollTo({ top: el.scrollTop + ITEM_H, behavior: 'smooth' }) }
          if (e.key === 'ArrowUp') { e.preventDefault(); el.scrollTo({ top: el.scrollTop - ITEM_H, behavior: 'smooth' }) }
        }}
      >
        {items.map(v => (
          <button
            key={v}
            type="button"
            tabIndex={-1}
            className={cn('ob-wheel-item', v === value && 'is-on')}
            onClick={() => ref.current?.scrollTo({ top: (v - min) * ITEM_H, behavior: 'smooth' })}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Weight — horizontal scrolling scale with a fixed center indicator ──
const TICK_W = 12
function WeightScale({ value, min, max, onChange, ariaLabel }: {
  value: number; min: number; max: number; onChange: (v: number) => void; ariaLabel: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const raf = useRef<number>(0)
  const ticks: number[] = []
  for (let v = min; v <= max; v++) ticks.push(v)

  useEffect(() => {
    const el = ref.current
    if (el) el.scrollLeft = (value - min) * TICK_W
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onScroll = useCallback(() => {
    const el = ref.current
    if (!el) return
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      const v = clamp(min + Math.round(el.scrollLeft / TICK_W), min, max)
      if (v !== value) onChange(v)
    })
  }, [value, min, max, onChange])

  return (
    <div className="ob-scale-wrap">
      <span className="ob-scale-ind" aria-hidden />
      <div
        ref={ref}
        className="ob-scale"
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onScroll={onScroll}
        onKeyDown={e => {
          const el = ref.current
          if (!el) return
          if (e.key === 'ArrowRight') { e.preventDefault(); el.scrollTo({ left: el.scrollLeft + TICK_W * 5, behavior: 'smooth' }) }
          if (e.key === 'ArrowLeft') { e.preventDefault(); el.scrollTo({ left: el.scrollLeft - TICK_W * 5, behavior: 'smooth' }) }
        }}
      >
        {ticks.map(v => (
          <span key={v} className={cn('ob-tick', v % 10 === 0 && 'is-major', v % 5 === 0 && 'is-mid')}>
            {v % 10 === 0 && <span className="ob-tick-lab">{v}</span>}
          </span>
        ))}
      </div>
    </div>
  )
}

// Round − / + button with press-and-hold repeat for easy value picking.
function StepBtn({ onStep, ariaLabel, children }: {
  onStep: () => void; ariaLabel: string; children: ReactNode
}) {
  const timer = useRef<number | undefined>(undefined)
  const stop = useCallback(() => {
    if (timer.current !== undefined) { clearInterval(timer.current); timer.current = undefined }
  }, [])
  const start = useCallback(() => {
    onStep()
    stop()
    timer.current = window.setInterval(onStep, 110)
  }, [onStep, stop])
  useEffect(() => stop, [stop])
  return (
    <button
      type="button"
      className="ob-step"
      aria-label={ariaLabel}
      onPointerDown={e => { e.preventDefault(); start() }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
    >{children}</button>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [step, setStep] = useState<Step>('gender')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tipOpen, setTipOpen] = useState(false)
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm')
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg')
  const [data, setData] = useState<OnboardingData>({
    age: String(AGE.def), gender: '', heightCm: String(HEIGHT.def), weightKg: String(WEIGHT.def),
    goal: '', focusArea: '', totalDays: '75',
    startDate: new Date().toISOString().split('T')[0],
  })

  const stepIndex = STEPS.indexOf(step)

  function update(field: keyof OnboardingData, value: string) {
    setData(prev => ({ ...prev, [field]: value }))
  }
  // Functional bump so press-and-hold repeat always reads the latest value
  const bump = useCallback((field: 'heightCm' | 'weightKg', delta: number, min: number, max: number, def: number) => {
    setData(prev => {
      const cur = clamp(parseInt(prev[field], 10) || def, min, max)
      return { ...prev, [field]: String(clamp(cur + delta, min, max)) }
    })
  }, [])
  function next() {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) { setTipOpen(false); setStep(STEPS[idx + 1]) }
  }
  function back() {
    const idx = STEPS.indexOf(step)
    if (idx > 0) { setTipOpen(false); setStep(STEPS[idx - 1]) }
  }
  function canAdvance(): boolean {
    if (step === 'gender') return !!data.gender
    if (step === 'goal') return !!data.goal
    if (step === 'focus') return !!data.focusArea
    return true
  }

  async function submit() {
    setError('')
    setLoading(true)
    const res = await fetch('/api/users/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setLoading(false)
    if (!res.ok) { setError(t('onboarding.error_save')); return }
    const json = await res.json()
    if (json.profile) saveProfile(json.profile)
    router.push('/dashboard')
  }

  const genderOptions: { value: Gender; labelKey: string }[] = [
    { value: 'female', labelKey: 'onboarding.profile.female' },
    { value: 'male', labelKey: 'onboarding.profile.male' },
    { value: 'other', labelKey: 'onboarding.profile.other' },
  ]
  const goalOptions: { value: Goal; labelKey: string; descKey: string }[] = [
    { value: 'lose', labelKey: 'onboarding.goals.lose_label', descKey: 'onboarding.goals.lose_desc' },
    { value: 'gain', labelKey: 'onboarding.goals.gain_label', descKey: 'onboarding.goals.gain_desc' },
    { value: 'maintain', labelKey: 'onboarding.goals.maintain_label', descKey: 'onboarding.goals.maintain_desc' },
    { value: 'healthy', labelKey: 'onboarding.goals.healthy_label', descKey: 'onboarding.goals.healthy_desc' },
  ]
  const focusOptions: { value: FocusArea; labelKey: string }[] = [
    { value: 'nutrition', labelKey: 'onboarding.focus.nutrition' },
    { value: 'workout', labelKey: 'onboarding.focus.workout' },
    { value: 'sleep', labelKey: 'onboarding.focus.sleep' },
    { value: 'other', labelKey: 'onboarding.focus.other' },
  ]

  const stepMeta: Record<Step, { title: string; tip: string }> = {
    gender: { title: 'onboarding.q_gender.title', tip: 'onboarding.q_gender.tip' },
    age: { title: 'onboarding.q_age.title', tip: 'onboarding.q_age.tip' },
    height: { title: 'onboarding.q_height.title', tip: 'onboarding.q_height.tip' },
    weight: { title: 'onboarding.q_weight.title', tip: 'onboarding.q_weight.tip' },
    goal: { title: 'onboarding.goals.title', tip: 'onboarding.goals.tip' },
    focus: { title: 'onboarding.focus.title', tip: 'onboarding.focus.tip' },
    timeline: { title: 'onboarding.timeline.title', tip: 'onboarding.timeline.tip' },
  }

  const total = parseInt(data.totalDays, 10) || 75
  const ageVal = clamp(parseInt(data.age, 10) || AGE.def, AGE.min, AGE.max)
  const hCm = clamp(parseInt(data.heightCm, 10) || HEIGHT.def, HEIGHT.min, HEIGHT.max)
  const wKg = clamp(parseInt(data.weightKg, 10) || WEIGHT.def, WEIGHT.min, WEIGHT.max)

  const hM = hCm / 100
  const bmi = wKg / (hM * hM)
  const bmiText = bmi.toFixed(1)
  const bmiCat =
    bmi < 18.5 ? { key: 'onboarding.bmi.under', color: '#3b82f6' }
    : bmi < 25 ? { key: 'onboarding.bmi.healthy', color: '#22a06b' }
    : bmi < 30 ? { key: 'onboarding.bmi.over', color: '#d98a2b' }
    : { key: 'onboarding.bmi.obese', color: '#d9622e' }

  const isLast = step === 'timeline'

  return (
    <div className="ob-flow">
      <style>{`
        .ob-flow {
          position: relative; z-index: 1;
          width: 100%; max-width: 30rem;
          min-height: min(88vh, 780px);
          display: flex; flex-direction: column;
          color: var(--foreground);
        }

        /* ── Header: wordmark + day marker + progress ── */
        .ob-top { flex: none; }
        .ob-brand {
          display: flex; align-items: center; justify-content: space-between;
          font-family: var(--font-geist-mono), ui-monospace, monospace;
          font-size: 0.64rem; letter-spacing: 0.28em; text-transform: uppercase;
          color: var(--muted-foreground);
        }
        .ob-brand-l { display: inline-flex; align-items: center; gap: 0.55rem; }
        .ob-brand-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--brand); box-shadow: 0 0 10px var(--brand);
          animation: ob-pulse 2.6s ease-in-out infinite;
        }
        .ob-day { color: var(--foreground); }
        .ob-day b { color: var(--brand); font-weight: 700; }
        .ob-bar { display: flex; gap: 0.35rem; margin-top: 0.9rem; }
        .ob-seg { flex: 1; height: 7px; border-radius: 99px; background: rgba(45,49,66,0.1); overflow: hidden; position: relative; }
        .ob-seg-fill {
          position: absolute; inset: 0; border-radius: 99px; transform: scaleX(0); transform-origin: left;
          background: linear-gradient(90deg, var(--brand), var(--brand-soft));
          transition: transform 0.55s cubic-bezier(0.16,1,0.3,1);
        }
        .ob-seg.is-on .ob-seg-fill { transform: scaleX(1); }

        /* ── Body ── */
        .ob-body {
          flex: 1; min-height: 0; display: flex; flex-direction: column;
          padding-top: clamp(1.4rem, 4vh, 2.4rem);
        }
        .ob-q {
          font-family: var(--font-fraunces), Georgia, serif; font-weight: 500;
          font-size: clamp(1.75rem, 6vw, 2.5rem); line-height: 1.05;
          letter-spacing: -0.02em; color: var(--foreground); margin: 0;
        }

        /* ── Behind the question ── */
        .ob-why {
          display: flex; align-items: flex-start; gap: 0.7rem;
          margin-top: 1rem; padding: 0.8rem 0.95rem; border-radius: 18px;
          background: var(--brand-tint);
          border: 1px solid color-mix(in srgb, var(--brand) 24%, transparent);
        }
        .ob-why-ic {
          flex: none; width: 2rem; height: 2rem; border-radius: 50%;
          display: grid; place-items: center; color: #fff;
          background: linear-gradient(135deg, var(--brand), var(--brand-soft));
          box-shadow: 0 6px 16px -6px rgba(217,98,46,0.55);
        }
        .ob-why-body { min-width: 0; }
        .ob-why-lab {
          display: block; font-family: var(--font-geist-mono), ui-monospace, monospace;
          font-size: 0.62rem; letter-spacing: 0.16em; text-transform: uppercase;
          color: var(--brand); margin-bottom: 0.15rem; font-weight: 600;
        }
        .ob-why-txt { font-size: 0.86rem; line-height: 1.45; color: var(--foreground); opacity: 0.82; margin: 0; }
        .ob-why-more { border: 0; background: none; padding: 0 0 0 0.35rem;
          color: var(--brand); font-weight: 700; font-size: 0.84rem; cursor: pointer; }
        .ob-why-more:hover { text-decoration: underline; }

        /* Control area — centered in remaining space */
        .ob-stage { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: center;
          padding: clamp(0.8rem, 3vh, 1.8rem) 0; }

        /* Big numeric readout + unit toggle row */
        .ob-readout { display: flex; align-items: center; justify-content: center; gap: 0.9rem; margin-bottom: 0.4rem; }
        .ob-readout-num { font-family: var(--font-fraunces), Georgia, serif; font-weight: 600;
          font-size: clamp(2.6rem, 10vw, 3.4rem); line-height: 1; color: var(--foreground); font-variant-numeric: tabular-nums; }
        .ob-readout-unit { font-size: 1.1rem; color: var(--muted-foreground); margin-left: 0.2rem; }
        .ob-toggle { display: inline-flex; padding: 3px; border-radius: 12px; background: rgba(45,49,66,0.07); }
        .ob-toggle button { border: 0; background: none; cursor: pointer; padding: 0.35rem 0.85rem; border-radius: 9px;
          font-size: 0.82rem; font-weight: 700; color: var(--muted-foreground); transition: all 0.2s ease; }
        .ob-toggle button.is-on { background: var(--foreground); color: #fff; box-shadow: 0 3px 8px -2px rgba(45,49,66,0.4); }

        /* ── Gender cards ── */
        .ob-genders { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.7rem; }
        .ob-gender {
          padding: 1.4rem 0.5rem; border-radius: 22px; border: 1.5px solid var(--border);
          font-size: 0.98rem; font-weight: 600; color: var(--foreground); cursor: pointer;
          background: linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.66));
          backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
          box-shadow: 0 10px 26px -18px rgba(45,49,66,0.4); position: relative;
          transition: all 0.2s ease;
        }
        .ob-gender:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--brand) 45%, transparent); }
        .ob-gender.is-on {
          border-color: var(--brand); background: var(--brand-tint);
          box-shadow: 0 14px 30px -16px rgba(217,98,46,0.5);
        }
        .ob-gender-ck { position: absolute; top: 0.6rem; right: 0.6rem; width: 1.35rem; height: 1.35rem;
          border-radius: 50%; display: grid; place-items: center; color: #fff;
          background: linear-gradient(135deg, var(--brand), var(--brand-soft)); }

        /* ── Age wheel (vertical) ── */
        .ob-wheel-wrap { position: relative; height: ${ITEM_H * 5}px; }
        .ob-wheel {
          height: 100%; overflow-y: auto; scroll-snap-type: y mandatory;
          padding-block: ${ITEM_H * 2}px; scrollbar-width: none; -ms-overflow-style: none;
          position: relative; z-index: 1;
        }
        .ob-wheel::-webkit-scrollbar { display: none; }
        .ob-wheel-item {
          height: ${ITEM_H}px; width: 100%; scroll-snap-align: center; border: 0; background: none; cursor: pointer;
          display: grid; place-items: center; user-select: none;
          font-family: var(--font-fraunces), Georgia, serif; font-variant-numeric: tabular-nums;
          font-size: 1.4rem; color: var(--muted-foreground); opacity: 0.4; transition: all 0.18s ease;
        }
        .ob-wheel-item.is-on { opacity: 1; color: var(--foreground); font-weight: 600; font-size: 2.3rem; }
        .ob-wheel-hl {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
          width: 100%; height: ${ITEM_H}px; border-radius: 18px; z-index: 0; pointer-events: none;
          background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7));
          box-shadow: 0 10px 26px -14px rgba(45,49,66,0.35), inset 0 0 0 1px rgba(255,255,255,0.8);
        }
        .ob-wheel-caret {
          position: absolute; top: 50%; right: 0.55rem; transform: translateY(-50%);
          width: 15px; height: 17px; z-index: 2; pointer-events: none;
        }
        .ob-wheel-caret svg {
          width: 100%; height: 100%; transform-origin: right center;
          animation: ob-caret 1.5s cubic-bezier(0.34,1.56,0.64,1) infinite;
        }
        @keyframes ob-caret {
          0%,100% { transform: translateX(0) scaleX(1) scaleY(1); }
          35%     { transform: translateX(-6px) scaleX(0.68) scaleY(1.28); }
          62%     { transform: translateX(-1px) scaleX(1.08) scaleY(0.96); }
        }
        .ob-wheel-fade { position: absolute; left: 0; right: 0; height: 34%; z-index: 2; pointer-events: none; }
        .ob-wheel-fade-t { top: 0; background: linear-gradient(180deg, var(--background), transparent); }
        .ob-wheel-fade-b { bottom: 0; background: linear-gradient(0deg, var(--background), transparent); }

        /* ── Metric picker: unit toggle + big − / + steppers ── */
        .ob-metric-top { display: flex; justify-content: center; margin-bottom: 0.2rem; }
        .ob-picker { display: flex; align-items: center; justify-content: center; gap: 1.4rem; margin: 0.35rem 0 0.7rem; }
        .ob-picker .ob-readout-num { min-width: 7.5rem; text-align: center; }
        .ob-picker-lg { gap: 1.9rem; margin: 1.4rem 0; }
        .ob-picker-lg .ob-readout-num { font-size: clamp(3.2rem, 13vw, 4.4rem); min-width: 9.5rem; }
        .ob-picker-lg .ob-step { width: 3.5rem; height: 3.5rem; font-size: 2rem; }
        .ob-step {
          flex: none; width: 3rem; height: 3rem; border-radius: 50%; cursor: pointer; user-select: none; touch-action: none;
          border: 1px solid var(--border); background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.72));
          color: var(--foreground); font-size: 1.6rem; line-height: 1; display: grid; place-items: center;
          box-shadow: 0 6px 16px -10px rgba(45,49,66,0.5); transition: all 0.15s ease;
        }
        .ob-step:hover { border-color: var(--brand); color: var(--brand); transform: translateY(-2px); }
        .ob-step:active { background: var(--brand-tint); transform: scale(0.92); }

        /* ── Height: silhouette + vertical ruler ── */
        .ob-height { display: flex; align-items: stretch; gap: 1.1rem; height: 250px; }
        .ob-figure { flex: 1; display: flex; align-items: flex-end; justify-content: center; overflow: visible; }
        .ob-figure-inner {
          height: 100%; transform-origin: bottom center;
          transition: transform 0.45s cubic-bezier(0.16,1,0.3,1);
          filter: drop-shadow(0 10px 20px rgba(217,98,46,0.28));
        }
        .ob-figure-inner svg { height: 100%; width: auto; display: block; overflow: visible; }
        .ob-figure-body { animation: ob-float 3.8s ease-in-out infinite; will-change: transform; }
        .ob-figure-shadow { fill: rgba(45,49,66,0.14); animation: ob-shadow 3.8s ease-in-out infinite; }
        .ob-ruler {
          position: relative; width: 96px; flex: none; border-radius: 18px; cursor: ns-resize; touch-action: none; outline: none;
          background: linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.5));
          border: 1px solid var(--border); overflow: hidden;
        }
        .ob-ruler:focus-visible { border-color: var(--brand); box-shadow: 0 0 0 3px var(--brand-tint); }
        .ob-ruler-fill { position: absolute; left: 0; right: 0; bottom: 0; pointer-events: none;
          background: linear-gradient(to top, var(--brand-tint), transparent); transition: height 0.12s ease; }
        .ob-ruler-tick { position: absolute; right: 0; width: 62%; height: 1px; transform: translateY(50%);
          background: linear-gradient(90deg, transparent, rgba(45,49,66,0.18)); }
        .ob-ruler-tick-lab { position: absolute; right: 0.6rem; top: 50%; transform: translateY(-50%);
          font-size: 0.62rem; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
        .ob-ruler-ind { position: absolute; left: 0; right: 0; height: 3px; transform: translateY(50%); z-index: 3;
          background: var(--brand); box-shadow: 0 0 12px var(--brand-soft); border-radius: 2px; transition: bottom 0.12s ease; }
        .ob-ruler-knob { position: absolute; right: -1px; top: 50%; transform: translate(0,-50%);
          width: 26px; height: 26px; border-radius: 50%; background: var(--brand); border: 4px solid #fff;
          box-shadow: 0 3px 12px -1px rgba(217,98,46,0.65); }

        /* ── Weight: horizontal scale ── */
        .ob-scale-wrap { position: relative; height: 90px; }
        .ob-scale {
          height: 100%; overflow-x: auto; scroll-snap-type: x proximity; display: flex; align-items: flex-start;
          padding-inline: calc(50% - ${TICK_W / 2}px); scrollbar-width: none; -ms-overflow-style: none;
        }
        .ob-scale::-webkit-scrollbar { display: none; }
        .ob-tick { flex: none; width: ${TICK_W}px; height: 22px; position: relative; scroll-snap-align: center; }
        .ob-tick::before { content: ''; position: absolute; left: 50%; top: 0; width: 1.5px; height: 12px;
          transform: translateX(-50%); background: rgba(45,49,66,0.22); border-radius: 2px; }
        .ob-tick.is-mid::before { height: 16px; }
        .ob-tick.is-major::before { height: 24px; background: rgba(45,49,66,0.4); }
        .ob-tick-lab { position: absolute; top: 28px; left: 50%; transform: translateX(-50%);
          font-size: 0.66rem; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
        .ob-scale-ind { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 3px; height: 30px;
          background: var(--brand); border-radius: 2px; z-index: 3; box-shadow: 0 0 10px var(--brand-soft); }
        .ob-scale-ind::after { content: ''; position: absolute; left: 50%; top: 30px; transform: translateX(-50%);
          width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 7px solid var(--brand); }

        /* ── BMI card ── */
        .ob-bmi { display: flex; align-items: center; gap: 0.85rem; margin-top: 1.3rem;
          padding: 0.9rem 1.1rem; border-radius: 20px; border: 1px solid var(--border);
          background: linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.66));
          backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
          box-shadow: 0 12px 30px -20px rgba(45,49,66,0.4); }
        .ob-bmi-num { font-family: var(--font-fraunces), Georgia, serif; font-weight: 700;
          font-size: 1.7rem; line-height: 1; color: var(--foreground); font-variant-numeric: tabular-nums; }
        .ob-bmi-lab { font-size: 0.58rem; letter-spacing: 0.2em; text-transform: uppercase;
          color: var(--muted-foreground); font-family: var(--font-geist-mono), ui-monospace, monospace; }
        .ob-bmi-badge { display: inline-block; font-size: 0.66rem; font-weight: 800; padding: 0.22rem 0.6rem; border-radius: 99px; }
        .ob-bmi-note { font-size: 0.76rem; line-height: 1.4; color: var(--muted-foreground); margin: 0.2rem 0 0; }

        /* ── Option cards (goal / focus) ── */
        .ob-opts { display: flex; flex-direction: column; gap: 0.7rem; }
        .ob-focus-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; }
        .ob-opt {
          width: 100%; text-align: left; padding: 1rem 1.1rem; border-radius: 20px; border: 1.5px solid var(--border);
          background: linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.62));
          backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
          cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: space-between; gap: 0.8rem;
          box-shadow: 0 10px 26px -20px rgba(45,49,66,0.4);
        }
        .ob-opt:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--brand) 40%, transparent); }
        .ob-opt.is-on { border-color: var(--brand); background: var(--brand-tint); box-shadow: 0 14px 30px -18px rgba(217,98,46,0.5); }
        .ob-opt-title { display: block; font-weight: 600; font-size: 0.95rem; }
        .ob-opt-desc { display: block; font-size: 0.78rem; color: var(--muted-foreground); margin-top: 0.1rem; }
        .ob-opt-ck { flex: none; width: 1.4rem; height: 1.4rem; border-radius: 50%; display: grid; place-items: center;
          border: 1.5px solid var(--border); color: #fff; transition: all 0.2s ease; }
        .ob-opt.is-on .ob-opt-ck { border-color: transparent; background: linear-gradient(135deg, var(--brand), var(--brand-soft)); }
        .ob-focus { padding: 1.3rem 1rem; justify-content: center; text-align: center; font-weight: 600; position: relative; }
        .ob-focus .ob-opt-ck { position: absolute; top: 0.7rem; right: 0.7rem; }

        /* ── Footer ── */
        .ob-foot { flex: none; display: flex; gap: 0.7rem; padding-top: clamp(1.2rem, 3vh, 1.8rem); }
        .ob-back {
          flex: none; width: 3.4rem; height: 3.4rem; border-radius: 18px; border: 1px solid var(--border);
          display: grid; place-items: center; background: rgba(255,255,255,0.7); color: var(--foreground);
          cursor: pointer; transition: all 0.2s ease;
        }
        .ob-back:hover { background: #fff; transform: translateY(-1px); }
        .ob-next {
          flex: 1; height: 3.4rem; border-radius: 18px; border: 0; cursor: pointer;
          font-family: var(--font-fraunces), Georgia, serif; font-size: 1.05rem; font-weight: 600;
          display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
          color: var(--primary-foreground);
          background: linear-gradient(180deg, #363b4f 0%, var(--primary) 100%);
          box-shadow: 0 10px 26px -8px rgba(45,49,66,0.5); transition: all 0.2s ease;
        }
        .ob-next:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.07); }
        .ob-next:disabled { opacity: 0.45; cursor: not-allowed; }
        .ob-next.is-final {
          color: var(--brand-foreground);
          background: linear-gradient(135deg, var(--brand) 0%, var(--brand-soft) 100%);
          box-shadow: 0 12px 30px -8px rgba(217,98,46,0.55);
        }

        .ob-tl { display: flex; flex-direction: column; gap: 1.1rem; }
        .ob-tl-field { display: flex; flex-direction: column; gap: 0.5rem; }

        .ob-rise { animation: ob-rise 0.45s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes ob-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        @keyframes ob-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.3); opacity: 0.7; } }
        @keyframes ob-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
        @keyframes ob-shadow { 0%,100% { opacity: 0.55; } 50% { opacity: 0.32; } }
        @media (prefers-reduced-motion: reduce) {
          .ob-rise, .ob-brand-dot, .ob-figure-body, .ob-figure-shadow { animation: none; }
          .ob-wheel-caret svg { animation: none; transform: none; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="ob-top">
        <div className="ob-brand">
          <span className="ob-brand-l"><span className="ob-brand-dot" />{t('onboarding.brief')}</span>
          <span className="ob-day">{t('onboarding.day_marker')} <b>00</b> / {total}</span>
        </div>
        <div className="ob-bar" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={s} className={cn('ob-seg', i <= stepIndex && 'is-on')}>
              <span className="ob-seg-fill" />
            </span>
          ))}
        </div>
      </div>

      {/* ── Body (re-keyed per step so it re-animates) ── */}
      <div className="ob-body" key={step}>
        <h1 className="ob-q ob-rise">{t(stepMeta[step].title)}</h1>

        <div className="ob-rise" style={{ animationDelay: '0.05s' }}>
          <WhyChip
            label={t('onboarding.tip_label')}
            text={t(stepMeta[step].tip)}
            moreLabel={t('onboarding.tip_more')}
            lessLabel={t('onboarding.tip_less')}
            open={tipOpen}
            onToggle={() => setTipOpen(o => !o)}
          />
        </div>

        <div className="ob-stage ob-rise" style={{ animationDelay: '0.1s' }}>

          {step === 'gender' && (
            <div className="ob-genders">
              {genderOptions.map(o => {
                const on = data.gender === o.value
                return (
                  <button key={o.value} type="button" className={cn('ob-gender', on && 'is-on')}
                    aria-pressed={on} onClick={() => update('gender', o.value)}>
                    {on && <span className="ob-gender-ck"><Check size={13} strokeWidth={3} /></span>}
                    {t(o.labelKey)}
                  </button>
                )
              })}
            </div>
          )}

          {step === 'age' && (
            <AgeWheel value={ageVal} min={AGE.min} max={AGE.max}
              onChange={v => update('age', String(v))} ariaLabel={t('onboarding.q_age.title')} />
          )}

          {step === 'height' && (
            <div>
              <div className="ob-metric-top">
                <span className="ob-toggle" role="group" aria-label={t('onboarding.profile.height_label')}>
                  <button type="button" className={cn(heightUnit === 'cm' && 'is-on')} onClick={() => setHeightUnit('cm')}>{t('onboarding.profile.unit_cm')}</button>
                  <button type="button" className={cn(heightUnit === 'ft' && 'is-on')} onClick={() => setHeightUnit('ft')}>{t('onboarding.profile.unit_ft')}</button>
                </span>
              </div>
              <div className="ob-picker ob-picker-lg">
                <StepBtn onStep={() => bump('heightCm', -1, HEIGHT.min, HEIGHT.max, HEIGHT.def)} ariaLabel="−">−</StepBtn>
                <span className="ob-readout-num">
                  {heightUnit === 'cm' ? hCm : cmToFt(hCm)}
                  {heightUnit === 'cm' && <span className="ob-readout-unit">{t('onboarding.profile.unit_cm')}</span>}
                </span>
                <StepBtn onStep={() => bump('heightCm', 1, HEIGHT.min, HEIGHT.max, HEIGHT.def)} ariaLabel="+">+</StepBtn>
              </div>
            </div>
          )}

          {step === 'weight' && (
            <div>
              <div className="ob-metric-top">
                <span className="ob-toggle" role="group" aria-label={t('onboarding.profile.weight_label')}>
                  <button type="button" className={cn(weightUnit === 'kg' && 'is-on')} onClick={() => setWeightUnit('kg')}>{t('onboarding.profile.unit_kg')}</button>
                  <button type="button" className={cn(weightUnit === 'lb' && 'is-on')} onClick={() => setWeightUnit('lb')}>{t('onboarding.profile.unit_lb')}</button>
                </span>
              </div>
              <div className="ob-picker">
                <StepBtn onStep={() => bump('weightKg', -1, WEIGHT.min, WEIGHT.max, WEIGHT.def)} ariaLabel="−">−</StepBtn>
                <span className="ob-readout-num">
                  {weightUnit === 'kg' ? wKg : kgToLb(wKg)}
                  <span className="ob-readout-unit">{weightUnit === 'kg' ? t('onboarding.profile.unit_kg') : t('onboarding.profile.unit_lb')}</span>
                </span>
                <StepBtn onStep={() => bump('weightKg', 1, WEIGHT.min, WEIGHT.max, WEIGHT.def)} ariaLabel="+">+</StepBtn>
              </div>
              <WeightScale value={wKg} min={WEIGHT.min} max={WEIGHT.max}
                onChange={v => update('weightKg', String(v))} ariaLabel={t('onboarding.profile.weight_label')} />
              <div className="ob-bmi">
                <span>
                  <span className="ob-bmi-lab">{t('onboarding.profile.bmi')}</span>
                  <span className="ob-bmi-num" style={{ display: 'block' }}>{bmiText}</span>
                </span>
                <div style={{ minWidth: 0 }}>
                  <span className="ob-bmi-badge" style={{ color: bmiCat.color, background: `color-mix(in srgb, ${bmiCat.color} 16%, transparent)` }}>{t(bmiCat.key)}</span>
                  <p className="ob-bmi-note">{t('onboarding.bmi.note')}</p>
                </div>
              </div>
            </div>
          )}

          {step === 'goal' && (
            <div className="ob-opts">
              {goalOptions.map(o => {
                const on = data.goal === o.value
                return (
                  <button key={o.value} type="button" className={cn('ob-opt', on && 'is-on')} onClick={() => update('goal', o.value)}>
                    <span>
                      <span className="ob-opt-title">{t(o.labelKey)}</span>
                      <span className="ob-opt-desc">{t(o.descKey)}</span>
                    </span>
                    <span className="ob-opt-ck"><Check size={13} strokeWidth={3} /></span>
                  </button>
                )
              })}
            </div>
          )}

          {step === 'focus' && (
            <div className="ob-focus-grid">
              {focusOptions.map(o => {
                const on = data.focusArea === o.value
                return (
                  <button key={o.value} type="button" className={cn('ob-opt', 'ob-focus', on && 'is-on')} onClick={() => update('focusArea', o.value)}>
                    {on && <span className="ob-opt-ck"><Check size={13} strokeWidth={3} /></span>}
                    {t(o.labelKey)}
                  </button>
                )
              })}
            </div>
          )}

          {step === 'timeline' && (
            <div className="ob-tl">
              <div className="ob-tl-field">
                <Label>{t('onboarding.timeline.start_date')}</Label>
                <Input type="date" value={data.startDate} onChange={e => update('startDate', e.target.value)} />
              </div>
              <div className="ob-tl-field">
                <Label>
                  {t('onboarding.timeline.total_days')}{' '}
                  <span className="text-muted-foreground font-normal">{t('onboarding.timeline.total_days_hint')}</span>
                </Label>
                {/* Fixed whitelist of supported lengths — the server rejects any
                    other value, so the client only ever offers these four. */}
                <span className="ob-toggle" role="group" aria-label={t('onboarding.timeline.total_days')}>
                  {ALLOWED_CHALLENGE_LENGTHS.map(len => (
                    <button
                      key={len}
                      type="button"
                      className={cn(total === len && 'is-on')}
                      aria-pressed={total === len}
                      onClick={() => update('totalDays', String(len))}
                    >
                      {len}
                    </button>
                  ))}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* ── Footer ── */}
      <div className="ob-foot">
        {stepIndex > 0 && (
          <button type="button" className="ob-back" onClick={back} disabled={loading} aria-label={t('onboarding.back')}>
            <ArrowLeft size={20} />
          </button>
        )}
        <button
          type="button"
          className={cn('ob-next', isLast && 'is-final')}
          onClick={isLast ? submit : next}
          disabled={loading || !canAdvance()}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLast ? t('onboarding.start') : t('onboarding.next')}
          {!isLast && <ArrowRight size={18} />}
        </button>
      </div>
    </div>
  )
}
