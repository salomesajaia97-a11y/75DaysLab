'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Check, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n'
import { saveProfile } from '@/lib/storage'
import type { Goal, FocusArea, Gender } from '@/types'

type Step = 'profile' | 'goals' | 'focus' | 'timeline'

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

const STEPS: Step[] = ['profile', 'goals', 'focus', 'timeline']

export default function OnboardingPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [step, setStep] = useState<Step>('profile')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<OnboardingData>({
    age: '', gender: '', heightCm: '', weightKg: '',
    goal: '', focusArea: '', totalDays: '75',
    startDate: new Date().toISOString().split('T')[0],
  })

  const stepIndex = STEPS.indexOf(step)

  function update(field: keyof OnboardingData, value: string) {
    setData(prev => ({ ...prev, [field]: value }))
  }

  function next() {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
  }

  function back() {
    const idx = STEPS.indexOf(step)
    if (idx > 0) setStep(STEPS[idx - 1])
  }

  function canAdvance(): boolean {
    if (step === 'profile') return !!data.age && !!data.gender && !!data.heightCm && !!data.weightKg
    if (step === 'goals') return !!data.goal
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
    if (!res.ok) {
      setError(t('onboarding.error_save'))
      return
    }
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

  // Step ledger — short labels + the narrative subline shown on the ritual panel
  const ledger: { step: Step; labelKey: string; subKey: string }[] = [
    { step: 'profile', labelKey: 'onboarding.ledger.profile', subKey: 'onboarding.profile.sub' },
    { step: 'goals', labelKey: 'onboarding.ledger.goals', subKey: 'onboarding.goals.sub' },
    { step: 'focus', labelKey: 'onboarding.ledger.focus', subKey: 'onboarding.focus.sub' },
    { step: 'timeline', labelKey: 'onboarding.ledger.timeline', subKey: 'onboarding.timeline.sub' },
  ]

  const stepTitleKeys: Record<Step, string> = {
    profile: 'onboarding.profile.title',
    goals: 'onboarding.goals.title',
    focus: 'onboarding.focus.title',
    timeline: 'onboarding.timeline.title',
  }
  const stepSubKeys: Record<Step, string> = {
    profile: 'onboarding.profile.sub',
    goals: 'onboarding.goals.sub',
    focus: 'onboarding.focus.sub',
    timeline: 'onboarding.timeline.sub',
  }

  const total = parseInt(data.totalDays, 10) || 75
  const num = String(stepIndex + 1).padStart(2, '0')

  return (
    <div className="ob-shell">
      {/* Scoped styles for the ritual panel + step animations. Prefixed `ob-`
          so nothing collides with the global glass/aurora system. */}
      <style>{`
        .ob-shell {
          position: relative; z-index: 1;
          width: 100%; max-width: 64rem;
          display: grid; grid-template-columns: 1fr;
          border-radius: 32px; overflow: hidden;
          box-shadow: 0 30px 80px -30px rgba(45,49,66,0.45),
                      0 10px 30px -12px rgba(45,49,66,0.18);
        }
        @media (min-width: 820px) {
          .ob-shell { grid-template-columns: 0.92fr 1.08fr; min-height: 580px; }
        }

        /* ── Left: the briefing / ritual panel ── */
        .ob-ritual {
          position: relative; overflow: hidden;
          padding: clamp(1.6rem, 3vw, 2.6rem);
          display: flex; flex-direction: column;
          color: #f4ecdc;
          background:
            radial-gradient(120% 80% at 18% 0%, rgba(255,138,76,0.30) 0%, transparent 52%),
            radial-gradient(120% 90% at 100% 108%, rgba(255,90,31,0.42) 0%, transparent 56%),
            linear-gradient(165deg, #211a36 0%, #14101d 58%, #0c0a14 100%);
        }
        .ob-grain {
          position: absolute; inset: 0; opacity: 0.06; mix-blend-mode: overlay; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        .ob-particles { position: absolute; inset: 0; pointer-events: none; }
        .ob-particle {
          position: absolute; border-radius: 50%;
          background: rgba(255, 224, 188, 0.9);
          box-shadow: 0 0 12px 3px rgba(255, 200, 150, 0.45);
          animation: th-drift linear infinite;
        }
        .ob-ghost {
          position: absolute; right: -1.5rem; bottom: -5rem; z-index: 0;
          font-family: var(--font-fraunces), Georgia, serif; font-weight: 600;
          font-size: clamp(13rem, 22vw, 20rem); line-height: 0.7;
          color: #fff; opacity: 0.06; pointer-events: none; user-select: none;
          animation: ob-ghost-pop 0.6s cubic-bezier(0.16,1,0.3,1) both;
        }
        .ob-eyebrow {
          position: relative; z-index: 2;
          display: inline-flex; align-items: center; gap: 0.6rem;
          font-family: var(--font-geist-mono), ui-monospace, monospace;
          font-size: 0.66rem; letter-spacing: 0.3em; text-transform: uppercase;
          color: #ffd9a8;
        }
        .ob-eyebrow-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #ff7a3c; box-shadow: 0 0 10px #ff7a3c;
          animation: ob-pulse 2.6s ease-in-out infinite;
        }
        .ob-headline {
          position: relative; z-index: 2; margin-top: auto;
          font-family: var(--font-fraunces), Georgia, serif; font-weight: 400;
          font-size: clamp(2rem, 3.4vw, 2.9rem); line-height: 1.02;
          letter-spacing: -0.02em; color: #fff5e8;
        }
        .ob-sub {
          position: relative; z-index: 2; margin-top: 0.9rem;
          font-size: 0.98rem; line-height: 1.5; color: rgba(244,236,220,0.66);
          max-width: 22rem;
        }
        /* Step ledger */
        .ob-ledger { position: relative; z-index: 2; margin-top: clamp(1.4rem, 3vh, 2.2rem); list-style: none; padding: 0; }
        .ob-row {
          display: flex; align-items: center; gap: 0.85rem; width: 100%;
          padding: 0.62rem 0; border: 0; background: none; cursor: default;
          color: rgba(244,236,220,0.42); text-align: left;
          font-size: 0.95rem; transition: color 0.3s ease, padding-left 0.3s ease;
        }
        .ob-row.is-done { color: rgba(244,236,220,0.7); cursor: pointer; }
        .ob-row.is-done:hover { padding-left: 0.4rem; color: #fff5e8; }
        .ob-row.is-active { color: #fff5e8; }
        .ob-row:focus-visible { outline: 2px solid #ff9d4d; outline-offset: 3px; border-radius: 6px; }
        .ob-num {
          width: 1.9rem; height: 1.9rem; flex: none;
          display: grid; place-items: center; border-radius: 50%;
          font-family: var(--font-geist-mono), ui-monospace, monospace;
          font-size: 0.72rem; letter-spacing: 0.04em;
          border: 1px solid rgba(255,255,255,0.18); color: inherit;
          transition: all 0.35s cubic-bezier(0.34,1.4,0.5,1);
        }
        .ob-row.is-active .ob-num {
          border-color: transparent; color: #fff;
          background: linear-gradient(135deg, #ff5a1f, #ff9d4d);
          box-shadow: 0 6px 18px -4px rgba(255,90,31,0.6);
          transform: scale(1.08);
        }
        .ob-row.is-done .ob-num {
          border-color: transparent; color: #14101d;
          background: #f3c372;
        }
        .ob-marker {
          position: relative; z-index: 2; margin-top: clamp(1.2rem, 3vh, 2rem);
          display: flex; align-items: baseline; gap: 0.4rem;
          font-family: var(--font-geist-mono), ui-monospace, monospace;
          color: rgba(244,236,220,0.85);
        }
        .ob-marker-lab { font-size: 0.6rem; letter-spacing: 0.26em; text-transform: uppercase; opacity: 0.6; }
        .ob-marker-num { font-size: 1.5rem; font-weight: 600; font-variant-numeric: tabular-nums; color: #f3c372; }
        .ob-marker-sep, .ob-marker-total { font-size: 0.85rem; opacity: 0.6; }

        /* ── Right: the form panel ── */
        .ob-form {
          position: relative;
          padding: clamp(1.8rem, 3vw, 2.8rem);
          background: linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.8) 100%);
          backdrop-filter: blur(22px) saturate(1.4); -webkit-backdrop-filter: blur(22px) saturate(1.4);
          display: flex; flex-direction: column;
        }
        .ob-progress { display: flex; gap: 0.4rem; margin-bottom: 0.5rem; }
        .ob-seg { height: 4px; flex: 1; border-radius: 99px; background: rgba(45,49,66,0.1); overflow: hidden; }
        .ob-seg-fill { display: block; height: 100%; width: 0; border-radius: 99px;
          background: linear-gradient(90deg, #d9622e, #e8884f);
          transition: width 0.6s cubic-bezier(0.16,1,0.3,1); }
        .ob-seg.is-filled .ob-seg-fill { width: 100%; }
        .ob-stepof {
          font-family: var(--font-geist-mono), ui-monospace, monospace;
          font-size: 0.68rem; letter-spacing: 0.2em; text-transform: uppercase;
          color: var(--muted-foreground);
        }

        /* Step content reveal — re-keyed per step so it replays */
        .ob-pane { display: flex; flex-direction: column; gap: 1rem; }
        .ob-rise { opacity: 0; animation: ob-rise 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }

        @keyframes ob-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @keyframes ob-ghost-pop { from { opacity: 0; transform: translateY(20px) scale(0.96); } to { opacity: 0.06; transform: none; } }
        @keyframes ob-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.3); opacity: 0.7; } }

        @media (prefers-reduced-motion: reduce) {
          .ob-particle, .ob-eyebrow-dot { animation: none; }
          .ob-ghost, .ob-rise { animation: none; opacity: 1; transform: none; }
          .ob-ghost { opacity: 0.06; }
        }
      `}</style>

      {/* ═══ LEFT — INTAKE BRIEFING (ritual panel) ═══ */}
      <div className="ob-ritual">
        <div className="ob-grain" aria-hidden />
        <div className="ob-particles" aria-hidden>
          {/* Deterministic positions/timings — no Math.random (SSR-safe) */}
          {[
            { l: '12%', t: '22%', s: 4, d: 7, delay: 0 },
            { l: '74%', t: '14%', s: 3, d: 9, delay: 1.2 },
            { l: '40%', t: '40%', s: 5, d: 8, delay: 0.6 },
            { l: '86%', t: '54%', s: 3, d: 10, delay: 2 },
            { l: '24%', t: '70%', s: 4, d: 7.5, delay: 1.6 },
            { l: '60%', t: '78%', s: 3, d: 9.5, delay: 0.3 },
          ].map((p, i) => (
            <span
              key={i}
              className="ob-particle"
              style={{ left: p.l, top: p.t, width: p.s, height: p.s, animationDuration: `${p.d}s`, animationDelay: `${p.delay}s` }}
            />
          ))}
        </div>

        {/* Ghost numeral = current step, cross-fades on change via key */}
        <span key={num} className="ob-ghost" aria-hidden>{num}</span>

        <span className="ob-eyebrow">
          <span className="ob-eyebrow-dot" />
          {t('onboarding.brief')}
        </span>

        <h2 key={`h-${step}`} className="ob-headline ob-rise">{t(stepTitleKeys[step])}</h2>
        <p key={`s-${step}`} className="ob-sub ob-rise" style={{ animationDelay: '0.08s' }}>{t(stepSubKeys[step])}</p>

        <ul className="ob-ledger">
          {ledger.map((row, i) => {
            const done = i < stepIndex
            const active = i === stepIndex
            const clickable = done
            return (
              <li key={row.step}>
                <button
                  type="button"
                  className={cn('ob-row', done && 'is-done', active && 'is-active')}
                  onClick={() => clickable && setStep(row.step)}
                  disabled={!clickable && !active}
                  aria-current={active ? 'step' : undefined}
                >
                  <span className="ob-num">{done ? <Check size={14} strokeWidth={2.5} /> : String(i + 1).padStart(2, '0')}</span>
                  {t(row.labelKey)}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="ob-marker">
          <span className="ob-marker-lab">{t('onboarding.day_marker')}</span>
          <span className="ob-marker-num">00</span>
          <span className="ob-marker-sep">/</span>
          <span className="ob-marker-total">{total}</span>
        </div>
      </div>

      {/* ═══ RIGHT — FORM ═══ */}
      <div className="ob-form">
        <div className="ob-progress" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={s} className={cn('ob-seg', i <= stepIndex && 'is-filled')}>
              <span className="ob-seg-fill" />
            </span>
          ))}
        </div>
        <p className="ob-stepof mb-6">{t('onboarding.step_of', { current: stepIndex + 1, total: STEPS.length })}</p>

        {/* re-key the whole pane on step change so the reveal replays */}
        <div key={step} className="ob-pane flex-1">

          {step === 'profile' && (
            <>
              <div className="ob-rise grid grid-cols-2 gap-4" style={{ animationDelay: '0.04s' }}>
                <div className="space-y-2">
                  <Label>{t('onboarding.profile.age')}</Label>
                  <Input type="number" placeholder="25" value={data.age} onChange={e => update('age', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t('onboarding.profile.gender')}</Label>
                  <div className="flex gap-2">
                    {genderOptions.map(o => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => update('gender', o.value)}
                        className={cn(
                          'flex-1 py-2 rounded-xl border text-sm font-medium transition-all duration-200',
                          data.gender === o.value
                            ? 'bg-brand text-white border-transparent shadow-[0_6px_16px_-6px_rgba(217,98,46,0.6)]'
                            : 'border-border hover:bg-accent hover:border-[var(--brand)]/40'
                        )}
                      >{t(o.labelKey)}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="ob-rise grid grid-cols-2 gap-4" style={{ animationDelay: '0.1s' }}>
                <div className="space-y-2">
                  <Label>{t('onboarding.profile.height')}</Label>
                  <Input type="number" placeholder="170" value={data.heightCm} onChange={e => update('heightCm', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t('onboarding.profile.weight')}</Label>
                  <Input type="number" placeholder="70" value={data.weightKg} onChange={e => update('weightKg', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {step === 'goals' && (
            <div className="space-y-2.5">
              {goalOptions.map((o, i) => {
                const selected = data.goal === o.value
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => update('goal', o.value)}
                    style={{ animationDelay: `${0.04 + i * 0.05}s` }}
                    className={cn(
                      'ob-rise w-full px-4 py-3 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between gap-3',
                      selected
                        ? 'border-[var(--brand)] bg-[var(--brand)]/8 shadow-[0_8px_22px_-12px_rgba(217,98,46,0.5)]'
                        : 'border-border hover:bg-accent hover:border-[var(--brand)]/40'
                    )}
                  >
                    <span>
                      <span className="block font-semibold text-sm">{t(o.labelKey)}</span>
                      <span className="block text-xs text-muted-foreground">{t(o.descKey)}</span>
                    </span>
                    <span className={cn(
                      'flex-none grid place-items-center w-5 h-5 rounded-full border transition-all duration-200',
                      selected ? 'bg-brand border-transparent text-white scale-100' : 'border-border scale-90 opacity-0'
                    )}>
                      <Check size={13} strokeWidth={3} />
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {step === 'focus' && (
            <div className="grid grid-cols-2 gap-3">
              {focusOptions.map((o, i) => {
                const selected = data.focusArea === o.value
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => update('focusArea', o.value)}
                    style={{ animationDelay: `${0.04 + i * 0.05}s` }}
                    className={cn(
                      'ob-rise relative p-5 rounded-2xl border font-medium transition-all duration-200',
                      selected
                        ? 'border-[var(--brand)] bg-[var(--brand)]/8 shadow-[0_8px_22px_-12px_rgba(217,98,46,0.5)]'
                        : 'border-border hover:bg-accent hover:border-[var(--brand)]/40'
                    )}
                  >
                    {t(o.labelKey)}
                    {selected && (
                      <span className="absolute top-2.5 right-2.5 grid place-items-center w-5 h-5 rounded-full bg-brand text-white">
                        <Check size={13} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {step === 'timeline' && (
            <div className="space-y-4">
              <div className="ob-rise space-y-2" style={{ animationDelay: '0.04s' }}>
                <Label>{t('onboarding.timeline.start_date')}</Label>
                <Input type="date" value={data.startDate} onChange={e => update('startDate', e.target.value)} />
              </div>
              <div className="ob-rise space-y-2" style={{ animationDelay: '0.1s' }}>
                <Label>
                  {t('onboarding.timeline.total_days')}{' '}
                  <span className="text-muted-foreground font-normal">{t('onboarding.timeline.total_days_hint')}</span>
                </Label>
                <Input
                  type="number" min="1" max="365"
                  value={data.totalDays}
                  onChange={e => update('totalDays', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive mt-3">{error}</p>}

        <div className="flex gap-3 pt-6">
          {stepIndex > 0 && (
            <Button variant="outline" className="flex-1" onClick={back} disabled={loading}>{t('onboarding.back')}</Button>
          )}
          {step !== 'timeline' ? (
            <Button className="flex-1 group" onClick={next} disabled={!canAdvance()}>
              {t('onboarding.continue')}
              <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          ) : (
            <Button className="flex-1 bg-brand" onClick={submit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('onboarding.start')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
