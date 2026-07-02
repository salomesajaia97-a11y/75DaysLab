'use client'
import { useEffect, useState } from 'react'
import { Home, Dumbbell, Loader2, AlertCircle, Inbox } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/i18n'
import type { TrainLocation } from '@/lib/fitness/videos'
import type { IndoorFocus } from '@/lib/fitness/wger'
import { useWger } from './useWger'
import { WgerLoop } from './WgerLoop'
import { FitnessErrorBoundary } from './FitnessErrorBoundary'
import { FitnessMediaGrid } from './FitnessMediaGrid'

const PREFS_KEY = '75lab_indoor_prefs'

const FOCUS_OPTIONS: { id: IndoorFocus; key: string }[] = [
  { id: 'full', key: 'fitness.focus_full' },
  { id: 'core', key: 'fitness.focus_core' },
  { id: 'upper', key: 'fitness.focus_upper' },
  { id: 'lower', key: 'fitness.focus_lower' },
  { id: 'cardio', key: 'fitness.focus_cardio' },
  { id: 'yoga', key: 'fitness.focus_yoga' },
]

interface Prefs {
  location: TrainLocation
  focus: IndoorFocus
}

export function IndoorWorkout() {
  const { t } = useLanguage()
  const [prefs, setPrefs] = useState<Prefs>({ location: 'home', focus: 'full' })
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem(PREFS_KEY)
    /* eslint-disable react-hooks/set-state-in-effect -- hydration-safe localStorage sync */
    if (raw) {
      try {
        const p = JSON.parse(raw) as Partial<Prefs>
        setPrefs(prev => ({
          location: p.location === 'gym' ? 'gym' : 'home',
          focus: (p.focus as IndoorFocus) ?? prev.focus,
        }))
      } catch {
        /* ignore malformed prefs */
      }
    }
    setHydrated(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  useEffect(() => {
    if (hydrated) localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  }, [prefs, hydrated])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">🏠 {t('fitness.indoor_title')}</CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">{t('fitness.indoor_desc')}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Location toggle */}
        <div className="inline-flex rounded-xl border border-border p-0.5">
          {(['home', 'gym'] as const).map(loc => {
            const active = prefs.location === loc
            const Icon = loc === 'home' ? Home : Dumbbell
            return (
              <button
                key={loc}
                type="button"
                onClick={() => setPrefs(p => ({ ...p, location: loc }))}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(loc === 'home' ? 'fitness.loc_home' : 'fitness.loc_gym')}
              </button>
            )
          })}
        </div>

        {/* Focus selector */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">{t('fitness.focus')}</p>
          <div className="flex flex-wrap gap-1.5">
            {FOCUS_OPTIONS.map(opt => {
              const active = prefs.focus === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPrefs(p => ({ ...p, focus: opt.id }))}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t(opt.key)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Animated guide (wger) */}
        <section>
          <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t('fitness.tab_wger')}
          </p>
          <p className="mb-2 text-xs text-muted-foreground">{t('fitness.wger_note')}</p>
          <FitnessErrorBoundary
            fallback={
              <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {t('fitness.wger_crashed')}
              </div>
            }
          >
            <WgerSection focus={prefs.focus} />
          </FitnessErrorBoundary>
        </section>

        {/* Videos, GIFs & Animations (admin-managed) */}
        <section>
          <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Media
          </p>
          <p className="mb-2 text-xs text-muted-foreground">
            Videos, GIFs and animations for your selected focus.
          </p>
          <FitnessMediaGrid category={prefs.focus} />
        </section>
      </CardContent>
    </Card>
  )
}

/** Wger fetch-state machine: loading → success | empty | error. */
function WgerSection({ focus }: { focus: IndoorFocus }) {
  const { t } = useLanguage()
  const { status, exercises, reload } = useWger(focus)

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('fitness.wger_loading')}
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <span className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {t('fitness.wger_error')}
        </span>
        <Button size="sm" variant="outline" onClick={reload}>
          {t('fitness.wger_retry')}
        </Button>
      </div>
    )
  }

  if (status === 'empty') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border p-8 text-sm text-muted-foreground">
        <Inbox className="h-4 w-4" />
        {t('fitness.wger_empty')}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <WgerLoop exercises={exercises} />
      <p className="text-right text-[10px] text-muted-foreground">{t('fitness.wger_source')}</p>
    </div>
  )
}
