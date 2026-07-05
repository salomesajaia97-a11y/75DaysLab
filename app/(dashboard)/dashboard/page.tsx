'use client'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StreakCounter } from '@/components/streak/StreakCounter'
import { WaterTracker } from '@/components/water/WaterTracker'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getProfile,
  saveProfile,
  getStreak,
  getLastStreakDate,
  saveStreak,
  resetStreak,
  getDailyState,
  saveDailyState,
  todayString,
  yesterdayString,
} from '@/lib/storage'
import { calculateWaterGoal, calculateCurrentDay } from '@/lib/calculations'
import type { UserProfile } from '@/types'
import { WorkoutCard } from '@/components/workout/WorkoutCard'
import { ScrollReveal, Pop, Aurora, CountUp, Tilt } from '@/components/shared/Motion'
import { useLanguage } from '@/lib/i18n'
import { useDailyProgress, type DailyFlags } from '@/hooks/useDailyProgress'

interface Task {
  id: string
  label: string
  done: boolean
}

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
const FALLBACK_TOTAL = 75

export default function DashboardPage() {
  const { t } = useLanguage()

  const TASK_DEFS = [
    { id: 'water',     label: t('dashboard.task.water') },
    { id: 'journal',   label: t('dashboard.task.journal') },
    { id: 'workout',   label: t('dashboard.task.workout') },
    { id: 'nutrition', label: t('dashboard.task.nutrition') },
    { id: 'photo',     label: t('dashboard.task.photo') },
  ]

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [tasks, setTasks] = useState<Task[]>(TASK_DEFS.map(t => ({ ...t, done: false })))
  const [streak, setStreak] = useState(0)
  const today = todayString()

  // Server-authoritative daily state (self-healing). localStorage below is the
  // migration fallback used only until this resolves / on failure.
  const { data: progress } = useDailyProgress()

  useEffect(() => {
    const p = getProfile()
    if (p) {
      setProfile(p)
    } else {
      fetch('/api/users/me')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && !data.error) {
            saveProfile(data)
            setProfile(data)
          }
        })
        .catch(() => {})
    }

    // Hard reset: if yesterday's tasks exist and were incomplete, reset streak
    const yesterday = yesterdayString()
    const lastDate = getLastStreakDate()
    const yesterdayState = getDailyState(yesterday)
    const currentStreak = getStreak()

    if (yesterdayState) {
      const allDoneYesterday = TASK_DEFS.every(t => yesterdayState.tasks[t.id])
      if (!allDoneYesterday && lastDate !== today) {
        resetStreak()
        setStreak(0)
      } else {
        setStreak(currentStreak)
      }
    } else if (lastDate && lastDate < yesterday) {
      // Missed yesterday entirely
      resetStreak()
      setStreak(0)
    } else {
      setStreak(currentStreak)
    }

    // Restore today's task state
    const todayState = getDailyState(today)
    if (todayState) {
      setTasks(TASK_DEFS.map(t => ({ ...t, done: todayState.tasks[t.id] ?? false })))
    }
  }, [today])

  // Server truth wins: once /api/daily-progress resolves, seed task completion
  // and streak from it. Overrides the localStorage seed above; on request
  // failure `progress` stays null and the localStorage values remain in place.
  useEffect(() => {
    if (!progress) return
    // Seeding React state from fetched server data (not a render-derivable value
    // because tasks/streak are also locally mutable during the migration).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTasks(prev => prev.map(t => ({ ...t, done: flagForTask(t.id, progress.flags) })))
    if (progress.challenge) setStreak(progress.challenge.currentStreak)
  }, [progress])

  const toggleTask = useCallback((id: string) => {
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, done: !t.done } : t)
      const taskMap = Object.fromEntries(next.map(t => [t.id, t.done]))
      saveDailyState({ date: today, tasks: taskMap })

      const allDone = next.every(t => t.done)
      const lastDate = getLastStreakDate()
      if (allDone && lastDate !== today) {
        const newStreak = getStreak() + 1
        saveStreak(newStreak, today)
        setStreak(newStreak)
      }

      return next
    })
  }, [today])

  const completedCount = tasks.filter(t => t.done).length
  const allDone = completedCount === tasks.length

  const totalDays = profile?.totalDays ?? FALLBACK_TOTAL
  // Prefer server challenge day; fall back to the local calendar calc.
  const currentDay =
    progress?.challenge?.currentDay ??
    (profile ? calculateCurrentDay(profile.startDate, profile.totalDays) : 1)
  const waterGoal = profile
    ? calculateWaterGoal(profile.age, profile.weightKg, profile.heightCm, profile.gender, profile.goal)
    : FALLBACK_WATER
  const displayName = profile?.username ?? 'there'

  const autoCheckWorkout = useCallback(() => {
    const workoutTask = tasks.find(t => t.id === 'workout')
    if (workoutTask && !workoutTask.done) toggleTask('workout')
  }, [tasks, toggleTask])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('dashboard.greeting.morning') : hour < 17 ? t('dashboard.greeting.afternoon') : t('dashboard.greeting.evening')

  const stats = [
    { label: t('dashboard.stat.streak'), num: streak, icon: '🔥', grad: 'linear-gradient(135deg, #ff8a4c 0%, #ef4f2b 100%)', glow: 'rgba(239, 79, 43, 0.35)' },
    { label: t('dashboard.stat.day'),    num: currentDay, icon: '📅', grad: 'linear-gradient(135deg, #5eb6f7 0%, #2f72d6 100%)', glow: 'rgba(47, 114, 214, 0.35)' },
    { label: t('dashboard.stat.days_left'), num: Math.max(0, totalDays - currentDay), icon: '🏁', grad: 'linear-gradient(135deg, #5fd6a3 0%, #20a06b 100%)', glow: 'rgba(32, 160, 107, 0.35)' },
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
              {allDone && (
                <Badge className="mt-3 bg-green-500/20 text-green-700 border-green-500/30">
                  <Flame className="h-3 w-3 mr-1" /> {t('dashboard.day_complete')} 🎉
                </Badge>
              )}
            </div>
            <StreakCounter day={currentDay} totalDays={totalDays} />
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
            <WaterTracker consumedMl={0} goalMl={waterGoal} />
          </CardContent>
        </Card>

        <WorkoutCard onBothComplete={autoCheckWorkout} />

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t('dashboard.todays_tasks')}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {tasks.map(task => (
              <button
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                  task.done
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border hover:bg-accent'
                )}
              >
                {task.done
                  ? <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  : <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                }
                <span className={cn('text-sm', task.done && 'line-through text-muted-foreground')}>
                  {task.label}
                </span>
              </button>
            ))}
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
                <CountUp value={stat.num} />
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
