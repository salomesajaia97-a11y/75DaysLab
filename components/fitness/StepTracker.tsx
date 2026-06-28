'use client'
import { useEffect, useState } from 'react'
import { Footprints, Plus, RotateCcw, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/lib/i18n'
import { todayString } from '@/lib/storage'

const GOAL_KEY = '75lab_step_goal'
const STEPS_KEY = '75lab_steps'
const DEFAULT_GOAL = 10000
const QUICK_ADD = [500, 1000, 2500]

function readSteps(date: string): number {
  if (typeof window === 'undefined') return 0
  return parseInt(localStorage.getItem(`${STEPS_KEY}_${date}`) || '0', 10)
}
function readGoal(): number {
  if (typeof window === 'undefined') return DEFAULT_GOAL
  return parseInt(localStorage.getItem(GOAL_KEY) || String(DEFAULT_GOAL), 10) || DEFAULT_GOAL
}

/** Minimalist daily step goal tracker with a circular SVG progress ring. */
export function StepTracker() {
  const { t } = useLanguage()
  const today = todayString()
  const [hydrated, setHydrated] = useState(false)
  const [steps, setSteps] = useState(0)
  const [goal, setGoal] = useState(DEFAULT_GOAL)

  // Load after mount to avoid SSR hydration mismatch — intentional external
  // (localStorage) sync, which is what effects are for.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setSteps(readSteps(today))
    setGoal(readGoal())
    setHydrated(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [today])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(`${STEPS_KEY}_${today}`, String(steps))
  }, [steps, today, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(GOAL_KEY, String(goal))
  }, [goal, hydrated])

  const safeGoal = Math.max(goal, 1)
  const pct = Math.min(100, Math.round((steps / safeGoal) * 100))
  const reached = steps >= goal && goal > 0
  const remaining = Math.max(0, goal - steps)

  // SVG ring geometry.
  const R = 52
  const C = 2 * Math.PI * R
  const dash = (pct / 100) * C

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Footprints className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{t('fitness.steps_title')}</h3>
      </div>

      <div className="flex items-center gap-5">
        {/* Circular progress ring */}
        <div className="relative shrink-0" aria-hidden>
          <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
            <circle cx="64" cy="64" r={R} fill="none" stroke="var(--muted)" strokeWidth="8" />
            <circle
              cx="64"
              cy="64"
              r={R}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${C}`}
              className="transition-[stroke-dasharray] duration-500 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold tabular-nums">{hydrated ? pct : 0}%</span>
            <span className="text-[10px] text-muted-foreground">
              {hydrated ? steps.toLocaleString() : '—'}
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {reached
              ? t('fitness.steps_done')
              : t('fitness.steps_left', { n: remaining.toLocaleString() })}
          </p>

          {/* Goal input */}
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            {t('fitness.steps_goal')}
            <Input
              type="number"
              min={1}
              step={500}
              value={goal}
              onChange={e => setGoal(Math.max(0, parseInt(e.target.value || '0', 10)))}
              className="h-7 w-24 text-sm"
            />
          </label>

          {/* Quick add + sync */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ADD.map(n => (
              <Button
                key={n}
                size="xs"
                variant="outline"
                onClick={() => setSteps(s => s + n)}
              >
                <Plus className="h-3 w-3" />
                {n.toLocaleString()}
              </Button>
            ))}
            <Button
              size="xs"
              variant="secondary"
              onClick={() => setSteps(s => s + Math.round(safeGoal * 0.4))}
              title={t('fitness.steps_sync')}
            >
              <RefreshCw className="h-3 w-3" />
              {t('fitness.steps_sync')}
            </Button>
            <Button size="xs" variant="ghost" onClick={() => setSteps(0)}>
              <RotateCcw className="h-3 w-3" />
              {t('fitness.steps_reset')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
