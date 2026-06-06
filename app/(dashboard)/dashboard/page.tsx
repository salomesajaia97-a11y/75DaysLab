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
import { useLanguage } from '@/lib/i18n'

interface Task {
  id: string
  label: string
  done: boolean
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
  const currentDay = profile
    ? calculateCurrentDay(profile.startDate, profile.totalDays)
    : 1
  const waterGoal = profile
    ? calculateWaterGoal(profile.weightKg, profile.gender, profile.goal)
    : FALLBACK_WATER
  const displayName = profile?.username ?? 'there'

  const autoCheckWorkout = useCallback(() => {
    const workoutTask = tasks.find(t => t.id === 'workout')
    if (workoutTask && !workoutTask.done) toggleTask('workout')
  }, [tasks, toggleTask])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('dashboard.greeting.morning') : hour < 17 ? t('dashboard.greeting.afternoon') : t('dashboard.greeting.evening')

  const stats = [
    { label: t('dashboard.stat.streak'), value: streak !== 1 ? t('dashboard.stat.streak_value_plural', { n: streak }) : t('dashboard.stat.streak_value', { n: streak }), icon: '🔥' },
    { label: t('dashboard.stat.day'),    value: t('dashboard.stat.day_value', { n: currentDay }), icon: '📅' },
    { label: t('dashboard.stat.days_left'), value: t('dashboard.stat.days_left_value', { n: totalDays - currentDay }), icon: '🏁' },
  ]

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{greeting}, {displayName}</h1>
          <p className="text-muted-foreground mt-1">{t('dashboard.subtitle')}</p>
          {allDone && (
            <Badge className="mt-2 bg-green-500/20 text-green-400 border-green-500/30">
              <Flame className="h-3 w-3 mr-1" /> {t('dashboard.day_complete')} 🎉
            </Badge>
          )}
        </div>
        <StreakCounter day={currentDay} totalDays={totalDays} />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{t('dashboard.progress')}</span>
          <span>{t('dashboard.tasks_count', { done: completedCount, total: tasks.length })}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / tasks.length) * 100}%` }}
          />
        </div>
      </div>

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

      <div className="grid grid-cols-3 gap-4">
        {stats.map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-4 text-center">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
