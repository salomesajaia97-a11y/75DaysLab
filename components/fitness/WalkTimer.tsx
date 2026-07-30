'use client'
import { useCallback, useEffect, useState } from 'react'
import { Pause, Play, RotateCcw, CheckCircle2, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/i18n'
import { scopedKey } from '@/lib/storage'
import type { TbilisiPark } from '@/lib/fitness/parks'

const SESSION_KEY = '75lab_walk_session'
/** Outdoor target for the day — the ring the elapsed bar fills against. */
const TARGET_MIN = 45

interface StoredSession {
  slug: string
  /** Milliseconds banked from previous run/pause cycles. */
  accumulatedMs: number
  /** Epoch ms of the current run, or null while paused. */
  startedAt: number | null
}

function readSession(): StoredSession | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(scopedKey(SESSION_KEY))
  if (!raw) return null
  try {
    const s = JSON.parse(raw) as StoredSession
    return typeof s?.slug === 'string' ? s : null
  } catch {
    return null
  }
}

function fmt(ms: number): string {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = m.toString().padStart(2, '0')
  const ss = s.toString().padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

interface WalkTimerProps {
  park: TbilisiPark
  /** Called with the walked minutes when the user finishes the session. */
  onFinish: (park: TbilisiPark, minutes: number) => void
  /** True once the outdoor slot is logged for today — locks the finish action. */
  alreadyLogged: boolean
}

/**
 * Stopwatch bound to one chosen spot. Elapsed time is derived from wall-clock
 * timestamps (not tick counting) so background tabs and reloads stay accurate,
 * and the in-flight session is persisted per user.
 */
export function WalkTimer({ park, onFinish, alreadyLogged }: WalkTimerProps) {
  const { t, locale } = useLanguage()
  const [accumulatedMs, setAccumulatedMs] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(0)
  const [hydrated, setHydrated] = useState(false)

  // Restore (or drop) the stored session whenever the chosen park changes.
  useEffect(() => {
    const stored = readSession()
    /* eslint-disable react-hooks/set-state-in-effect */
    if (stored && stored.slug === park.slug) {
      setAccumulatedMs(stored.accumulatedMs)
      setStartedAt(stored.startedAt)
    } else {
      setAccumulatedMs(0)
      setStartedAt(null)
    }
    setNow(Date.now())
    setHydrated(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [park.slug])

  // Persist the in-flight session so a reload doesn't lose the walk.
  useEffect(() => {
    if (!hydrated) return
    const empty = accumulatedMs === 0 && startedAt === null
    if (empty) {
      localStorage.removeItem(scopedKey(SESSION_KEY))
      return
    }
    const payload: StoredSession = { slug: park.slug, accumulatedMs, startedAt }
    localStorage.setItem(scopedKey(SESSION_KEY), JSON.stringify(payload))
  }, [park.slug, accumulatedMs, startedAt, hydrated])

  // Re-render once a second while running; the value itself comes from clocks.
  useEffect(() => {
    if (startedAt === null) return
    setNow(Date.now()) // eslint-disable-line react-hooks/set-state-in-effect
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [startedAt])

  const running = startedAt !== null
  const elapsedMs = accumulatedMs + (running ? Math.max(0, now - startedAt) : 0)
  const minutes = Math.max(1, Math.round(elapsedMs / 60000))
  const pct = Math.min(100, (elapsedMs / (TARGET_MIN * 60000)) * 100)

  const toggle = useCallback(() => {
    if (startedAt === null) {
      setStartedAt(Date.now())
    } else {
      setAccumulatedMs(a => a + Math.max(0, Date.now() - startedAt))
      setStartedAt(null)
    }
    setNow(Date.now())
  }, [startedAt])

  const reset = useCallback(() => {
    setStartedAt(null)
    setAccumulatedMs(0)
  }, [])

  const finish = useCallback(() => {
    if (elapsedMs <= 0 || alreadyLogged) return
    onFinish(park, minutes)
    reset()
  }, [elapsedMs, alreadyLogged, onFinish, park, minutes, reset])

  return (
    <div
      className="rounded-2xl border border-border p-4"
      style={{ backgroundImage: 'var(--gradient-reading)' }}
    >
      <div className="flex items-center gap-2">
        <Timer className="h-4 w-4 text-foreground/70" />
        <h4 className="text-sm font-semibold">{t('fitness.walk_timer_title')}</h4>
      </div>
      <p className="mt-0.5 text-xs text-foreground/60">
        {t('fitness.walk_timer_at', { park: locale === 'ge' ? park.nameGe : park.name })}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <span className="text-4xl font-bold tabular-nums" aria-live="off">
          {fmt(elapsedMs)}
        </span>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={running ? 'outline' : 'default'} onClick={toggle}>
            {running ? (
              <>
                <Pause className="h-4 w-4" /> {t('fitness.pause')}
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />{' '}
                {elapsedMs > 0 ? t('fitness.walk_resume') : t('fitness.walk_start')}
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={finish}
            disabled={elapsedMs <= 0 || alreadyLogged}
          >
            <CheckCircle2 className="h-4 w-4" /> {t('fitness.walk_finish')}
          </Button>
          <Button size="sm" variant="ghost" onClick={reset} disabled={elapsedMs <= 0}>
            <RotateCcw className="h-4 w-4" /> {t('fitness.reset')}
          </Button>
        </div>
      </div>

      {/* progress toward the 45-minute outdoor target */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-background/70">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-foreground/60" aria-live="polite">
        {t('fitness.walk_target', { target: TARGET_MIN, minutes: Math.floor(elapsedMs / 60000) })}
      </p>
    </div>
  )
}
