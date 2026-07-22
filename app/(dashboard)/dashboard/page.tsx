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
import type { UserProfile } from '@/types'
import { WorkoutCard } from '@/components/workout/WorkoutCard'
import { ScrollReveal, Pop, Aurora, CountUp, Tilt } from '@/components/shared/Motion'
import { useLanguage } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import { useDailyProgress, type DailyFlags } from '@/hooks/useDailyProgress'

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
  const allDone = Boolean(flags) && completedCount === tasks.length

  // Accurately-labeled, server-owned challenge values. No calendar-day fudging.
  const view = progress?.view ?? EMPTY_CHALLENGE_VIEW
  const waterGoal = profile
    ? calculateWaterGoal(profile.age, profile.weightKg, profile.heightCm, profile.gender, profile.goal)
    : FALLBACK_WATER
  const consumedMl = progress?.waterMl ?? 0
  // Identity comes from the validated server session — never the local cache.
  const displayName = session?.user?.name ?? 'there'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('dashboard.greeting.morning') : hour < 17 ? t('dashboard.greeting.afternoon') : t('dashboard.greeting.evening')

  const stats = [
    { label: t('dashboard.stat.streak'),    num: view.currentStreak, icon: '🔥', grad: 'linear-gradient(135deg, #ff8a4c 0%, #ef4f2b 100%)', glow: 'rgba(239, 79, 43, 0.35)' },
    { label: t('dashboard.stat.day'),       num: view.attemptDay,    icon: '📅', grad: 'linear-gradient(135deg, #5eb6f7 0%, #2f72d6 100%)', glow: 'rgba(47, 114, 214, 0.35)' },
    { label: t('dashboard.stat.days_left'), num: view.daysRemaining, icon: '🏁', grad: 'linear-gradient(135deg, #5fd6a3 0%, #20a06b 100%)', glow: 'rgba(32, 160, 107, 0.35)' },
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
                <Badge variant="outline" className="border-[#2d3142]/20 bg-white/40">
                  {t('dashboard.meta.completed')}: {view.totalCompletedDays}
                </Badge>
              </div>
              {view.isComplete ? (
                <Badge className="mt-3 bg-green-500/20 text-green-700 border-green-500/30">
                  <Flame className="h-3 w-3 mr-1" /> {t('dashboard.meta.complete')}
                </Badge>
              ) : allDone ? (
                <Badge className="mt-3 bg-green-500/20 text-green-700 border-green-500/30">
                  <Flame className="h-3 w-3 mr-1" /> {t('dashboard.day_complete')} 🎉
                </Badge>
              ) : null}
            </div>
            <StreakCounter day={view.attemptDay} totalDays={view.totalDays} />
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.05}>
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{t('dashboard.progress')}</span>
            <span>{t('dashboard.tasks_count', { done: completedCount, total: tasks.length })}</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(completedCount / tasks.length) * 100}%`,
                background: 'linear-gradient(90deg, #ff8a4c 0%, #ef4f2b 60%, #ffb169 100%)',
                boxShadow: '0 0 16px -2px rgba(239, 79, 43, 0.5)',
              }}
            />
          </div>
        </div>
      </ScrollReveal>

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

      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <Pop key={stat.label} delay={i * 0.1}>
            <Tilt>
            <div
              className="tile-pulse relative overflow-hidden rounded-3xl p-5 text-center text-white"
              style={{ background: stat.grad, boxShadow: `0 16px 34px -14px ${stat.glow}`, animationDelay: `${i * 0.5}s` }}
            >
              <div
                className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full"
                style={{ background: 'rgba(255,255,255,0.18)' }}
              />
              <span className="shine-sweep" style={{ animationDelay: `${i * 1.2}s` }} />
              <div className="relative text-3xl mb-1 drop-shadow-sm">{stat.icon}</div>
              <div className="relative text-4xl font-bold leading-none tracking-tight tabular-nums">
                {loading && !progress ? <span className="opacity-60">—</span> : <CountUp value={stat.num} />}
              </div>
              <div className="relative text-xs font-medium uppercase tracking-wide text-white/80 mt-1.5">{stat.label}</div>
            </div>
            </Tilt>
          </Pop>
        ))}
      </div>
      </div>
    </div>
  )
}
