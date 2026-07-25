'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StreakCounter } from '@/components/streak/StreakCounter'
import { WaterTracker } from '@/components/water/WaterTracker'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle, Flame, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getProfile, saveProfile } from '@/lib/storage'
import { calculateWaterGoal } from '@/lib/calculations'
import { EMPTY_CHALLENGE_VIEW } from '@/lib/progress'
import { percentComplete, type DayStatus, type DaySummary } from '@/lib/day-status'
import { addDays } from '@/lib/streak'
import type { UserProfile } from '@/types'
import { WorkoutCard } from '@/components/workout/WorkoutCard'
import { ScrollReveal, Pop, Aurora, CountUp, Tilt } from '@/components/shared/Motion'
import { useLanguage } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import { useDailyProgress, type DailyFlags } from '@/hooks/useDailyProgress'
import { useProgressHistory } from '@/hooks/useProgressHistory'

/** Map a dashboard task id to its server completion flag. */
function flagForTask(id: string, f: DailyFlags): boolean {
  switch (id) {
    case 'water': return f.waterCompleted
    case 'journal': return f.journalCompleted
    case 'workout': return f.workoutCompleted
    case 'nutrition': return f.nutritionCompleted
    case 'photo': return f.photoUploaded
    default: return false
  }
}

const FALLBACK_WATER = 2500

// Each task reflects a SERVER-derived completion flag; tapping navigates to the
// feature page where the real action (and its server record) happens. The
// checklist is never a local toggle — completion is authoritative on the server.
const TASK_ROUTES: Record<string, string> = {
  water: '/water',
  journal: '/journal',
  workout: '/fitness',
  nutrition: '/nutrition',
  photo: '/photos',
}

/** i18n key + swatch classes per day status (matches the app's badge palette). */
const STATUS_META: Record<DayStatus, { key: string; badge: string; dot: string }> = {
  perfect:   { key: 'dashboard.status.perfect_day',    badge: 'bg-green-500/15 text-green-700 border-green-500/30', dot: 'bg-green-500' },
  completed: { key: 'dashboard.status.completed_day',  badge: 'bg-amber-500/15 text-amber-700 border-amber-500/30', dot: 'bg-amber-500' },
  incomplete:{ key: 'dashboard.status.incomplete_day', badge: 'bg-muted text-muted-foreground border-border',       dot: 'bg-muted-foreground/40' },
}

/** Short 'Jul 20' label from a YYYY-MM-DD key (UTC — matches the log date keys). */
function formatDayLabel(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default function DashboardPage() {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const sessionUserId = session?.user?.id ?? null

  const TASK_DEFS = [
    { id: 'water',     label: t('dashboard.task.water') },
    { id: 'journal',   label: t('dashboard.task.journal') },
    { id: 'workout',   label: t('dashboard.task.workout') },
    { id: 'nutrition', label: t('dashboard.task.nutrition') },
    { id: 'photo',     label: t('dashboard.task.photo') },
  ]

  const [profile, setProfile] = useState<UserProfile | null>(null)

  // Server-authoritative daily + challenge state. This is the ONLY source of
  // truth for completion, streak, and day — localStorage is never consulted here.
  const { data: progress, loading, refetch } = useDailyProgress()
  // Read-only recent history (last 7 days). Re-fetches alongside a completion.
  const { data: historyData, loading: historyLoading } = useProgressHistory(7, progress?.flags.completedTaskCount ?? 0)

  useEffect(() => {
    // Profile is used only for the (non-authoritative) water-goal calc. Instant
    // paint from the user-scoped cache, then reconcile with the server (wins).
    const cached = getProfile()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cached) setProfile(cached)
    let active = true
    fetch('/api/users/me', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!active || !data || data.error) return
        saveProfile(data)
        setProfile(data)
      })
      .catch(() => {})
    return () => { active = false }
    // Re-fetch when the authenticated user changes so no prior user's profile lingers.
  }, [sessionUserId])

  // Server-derived task completion (read-only reflection).
  const flags = progress?.flags
  const tasks = TASK_DEFS.map(d => ({ ...d, done: flags ? flagForTask(d.id, flags) : false }))
  const completedCount = tasks.filter(t => t.done).length
  const todayPercent = percentComplete(completedCount)
  // Day status is server-owned (canonical 3/5 & 5/5 thresholds). Perfect ⊂ Completed.
  const isPerfectDay = Boolean(flags?.isPerfectDay)
  const isCompletedDay = Boolean(flags?.isCompleted)

  // Accurately-labeled, server-owned challenge values. No calendar-day fudging.
  const view = progress?.view ?? EMPTY_CHALLENGE_VIEW
  const perfectDays = progress?.perfectDays ?? 0
  const waterGoal = profile
    ? calculateWaterGoal(profile.age, profile.weightKg, profile.heightCm, profile.gender, profile.goal)
    : FALLBACK_WATER
  const consumedMl = progress?.waterMl ?? 0
  // Identity comes from the validated server session — never the local cache.
  const displayName = session?.user?.name ?? 'there'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('dashboard.greeting.morning') : hour < 17 ? t('dashboard.greeting.afternoon') : t('dashboard.greeting.evening')

  // Recent history + yesterday, derived from the read-only history endpoint.
  const history = historyData?.history ?? []
  const yesterdayKey = historyData ? addDays(historyData.today, -1) : null
  const yesterday: DaySummary | null = yesterdayKey ? history.find(h => h.date === yesterdayKey) ?? null : null

  // Five independent, clearly-labeled metrics (reusing the gradient tile style).
  const stats = [
    { key: 'day',     label: t('dashboard.stat.day'),            num: view.challengeDay,      sub: t('dashboard.stat.of', { n: view.totalDays }), icon: '📅', grad: 'linear-gradient(135deg, #5eb6f7 0%, #2f72d6 100%)', glow: 'rgba(47, 114, 214, 0.35)' },
    { key: 'done',    label: t('dashboard.stat.completed_days'), num: view.totalCompletedDays, sub: null,                                          icon: '✅', grad: 'linear-gradient(135deg, #5fd6a3 0%, #20a06b 100%)', glow: 'rgba(32, 160, 107, 0.35)' },
    { key: 'streak',  label: t('dashboard.stat.streak'),         num: view.currentStreak,      sub: null,                                          icon: '🔥', grad: 'linear-gradient(135deg, #ff8a4c 0%, #ef4f2b 100%)', glow: 'rgba(239, 79, 43, 0.35)' },
    { key: 'perfect', label: t('dashboard.stat.perfect_days'),   num: perfectDays,             sub: null,                                          icon: '⭐', grad: 'linear-gradient(135deg, #b388ff 0%, #7c4dff 100%)', glow: 'rgba(124, 77, 255, 0.35)' },
    { key: 'today',   label: t('dashboard.stat.today_progress'), num: todayPercent, suffix: '%', sub: t('dashboard.tasks_count', { done: completedCount, total: tasks.length }), icon: '📊', grad: 'linear-gradient(135deg, #4dd0e1 0%, #0891b2 100%)', glow: 'rgba(8, 145, 178, 0.35)' },
  ]

  return (
    <div className="relative">
      <Aurora />
      <div className="relative z-10 space-y-6 max-w-4xl mx-auto">
      {/* Hero panel — a living gradient "title slide" for the day */}
      <ScrollReveal>
        <div
          className="living-gradient relative overflow-hidden rounded-[2rem] p-7 md:p-8"
          style={{
            background: 'linear-gradient(120deg, #ffe7d3 0%, #ffd7e2 38%, #e7dbff 70%, #d6e6ff 100%)',
            boxShadow: '0 24px 60px -28px rgba(217, 98, 46, 0.45)',
          }}
        >
          <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.6), transparent 70%)' }} />
          <div className="pointer-events-none absolute -left-12 -bottom-20 h-56 w-56 rounded-full" style={{ background: 'radial-gradient(circle, rgba(217,98,46,0.18), transparent 70%)' }} />
          <span className="shine-sweep" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <span className="inline-block h-1.5 w-12 rounded-full mb-4" style={{ background: 'linear-gradient(90deg, #ff8a4c, #ef4f2b)' }} />
              <h1 className="text-4xl md:text-5xl font-bold leading-[1.05] text-[#2d3142]">{greeting},<br />{displayName}</h1>
              <p className="text-[#2d3142]/70 mt-2 max-w-md">{t('dashboard.subtitle')}</p>
              {/* Accurately-labeled, server-owned challenge metadata */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[#2d3142]/80">
                <Badge variant="outline" className="border-[#2d3142]/20 bg-white/40">
                  {t('dashboard.meta.length', { n: view.totalDays })}
                </Badge>
                <Badge variant="outline" className="border-[#2d3142]/20 bg-white/40">
                  {t('dashboard.meta.best')}: {view.longestStreak}
                </Badge>
              </div>
              {view.isComplete ? (
                <Badge className="mt-3 bg-green-500/20 text-green-700 border-green-500/30">
                  <Flame className="h-3 w-3 mr-1" /> {t('dashboard.meta.complete')}
                </Badge>
              ) : isPerfectDay ? (
                <Badge className="mt-3 bg-green-500/20 text-green-700 border-green-500/30">
                  <Flame className="h-3 w-3 mr-1" /> {t('dashboard.status.perfect_day')} 🎉
                </Badge>
              ) : isCompletedDay ? (
                <Badge className="mt-3 bg-amber-500/20 text-amber-700 border-amber-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> {t('dashboard.status.completed_day')}
                  <span className="ml-1 opacity-80">
                    · {t('dashboard.status.tasks_completed', { done: completedCount, total: tasks.length })}
                  </span>
                </Badge>
              ) : null}
            </div>
            <StreakCounter day={view.challengeDay} totalDays={view.totalDays} />
          </div>
        </div>
      </ScrollReveal>

      {/* Today's progress — live percentage + bar (updates after each task) */}
      <ScrollReveal delay={0.05}>
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{t('dashboard.progress')}</span>
            <span className="tabular-nums">
              {todayPercent}% · {t('dashboard.tasks_count', { done: completedCount, total: tasks.length })}
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${todayPercent}%`,
                background: 'linear-gradient(90deg, #ff8a4c 0%, #ef4f2b 60%, #ffb169 100%)',
                boxShadow: '0 0 16px -2px rgba(239, 79, 43, 0.5)',
              }}
            />
          </div>
        </div>
      </ScrollReveal>

      {/* Five independent metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((stat, i) => (
          <Pop key={stat.key} delay={i * 0.08}>
            <Tilt>
            <div
              className="tile-pulse relative overflow-hidden rounded-3xl p-4 text-center text-white h-full"
              style={{ background: stat.grad, boxShadow: `0 16px 34px -14px ${stat.glow}`, animationDelay: `${i * 0.5}s` }}
            >
              <div
                className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full"
                style={{ background: 'rgba(255,255,255,0.18)' }}
              />
              <span className="shine-sweep" style={{ animationDelay: `${i * 1.2}s` }} />
              <div className="relative text-2xl mb-1 drop-shadow-sm">{stat.icon}</div>
              <div className="relative text-3xl font-bold leading-none tracking-tight tabular-nums">
                {loading && !progress ? <span className="opacity-60">—</span> : <><CountUp value={stat.num} />{stat.suffix ?? ''}</>}
              </div>
              {stat.sub ? <div className="relative text-[11px] font-medium text-white/85 mt-1 tabular-nums">{stat.sub}</div> : null}
              <div className="relative text-[10px] font-medium uppercase tracking-wide text-white/80 mt-1.5 leading-tight">{stat.label}</div>
            </div>
            </Tilt>
          </Pop>
        ))}
      </div>

      <ScrollReveal delay={0.1}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t('dashboard.hydration')}</CardTitle></CardHeader>
          <CardContent className="flex justify-center py-2">
            <WaterTracker consumedMl={consumedMl} goalMl={waterGoal} />
          </CardContent>
        </Card>

        <WorkoutCard onBothComplete={refetch} />

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t('dashboard.todays_tasks')}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loading && !flags ? (
              // Skeleton — never show zero/stale completion before the server answers.
              <div className="space-y-2" aria-label={t('dashboard.loading')}>
                {TASK_DEFS.map(d => (
                  <div key={d.id} className="h-11 rounded-lg border border-border bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : (
              tasks.map(task => (
                <Link
                  key={task.id}
                  href={TASK_ROUTES[task.id] ?? '/dashboard'}
                  className={cn(
                    'group w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                    task.done
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-border hover:bg-accent'
                  )}
                >
                  {task.done
                    ? <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    : <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                  }
                  <span className={cn('text-sm flex-1', task.done && 'line-through text-muted-foreground')}>
                    {task.label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
      </ScrollReveal>

      {/* Yesterday summary + recent history */}
      <ScrollReveal delay={0.12}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Yesterday */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t('dashboard.yesterday')}</CardTitle></CardHeader>
          <CardContent className="py-2">
            {historyLoading && !historyData ? (
              <div className="h-16 rounded-lg bg-muted/40 animate-pulse" aria-label={t('dashboard.loading')} />
            ) : !yesterday || !yesterday.hasRecord ? (
              <p className="text-sm text-muted-foreground py-3">{t('dashboard.no_activity')}</p>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold tabular-nums leading-none">{yesterday.percent}%</div>
                  <div className="text-xs text-muted-foreground mt-1 tabular-nums">
                    {t('dashboard.tasks_count', { done: yesterday.completedTaskCount, total: yesterday.totalTasks })}
                  </div>
                </div>
                <Badge variant="outline" className={STATUS_META[yesterday.status].badge}>
                  {t(STATUS_META[yesterday.status].key)}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent history — last 7 days */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">{t('dashboard.recent')}</CardTitle></CardHeader>
          <CardContent className="py-2">
            {historyLoading && !historyData ? (
              <div className="space-y-2" aria-label={t('dashboard.loading')}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-9 rounded-lg bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {history.map(row => (
                  <li key={row.date} className="flex items-center gap-3 py-2 text-sm">
                    <span className="w-14 shrink-0 text-muted-foreground">{formatDayLabel(row.date)}</span>
                    {row.hasRecord ? (
                      <>
                        <span className={cn('h-2 w-2 rounded-full shrink-0', STATUS_META[row.status].dot)} />
                        <span className="w-12 shrink-0 tabular-nums font-medium">{row.percent}%</span>
                        <span className="w-10 shrink-0 tabular-nums text-muted-foreground">
                          {row.completedTaskCount}/{row.totalTasks}
                        </span>
                        <Badge variant="outline" className={cn('ml-auto', STATUS_META[row.status].badge)}>
                          {t(STATUS_META[row.status].key)}
                        </Badge>
                      </>
                    ) : (
                      <span className="text-muted-foreground/70">{t('dashboard.no_record')}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      </ScrollReveal>
      </div>
    </div>
  )
}
