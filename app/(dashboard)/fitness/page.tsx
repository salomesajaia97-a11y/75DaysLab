'use client'
import { useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getWorkoutState, todayString } from '@/lib/storage'
import type { WorkoutTrackerState } from '@/types'
import { useLanguage } from '@/lib/i18n'
import { OutdoorWorkout } from '@/components/fitness/OutdoorWorkout'
import { IndoorWorkout } from '@/components/fitness/IndoorWorkout'
import { ScrollReveal, Pop, Aurora, CountUp, Tilt } from '@/components/shared/Motion'

function getPast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

export default function FitnessPage() {
  const { t } = useLanguage()
  const today = todayString()
  const [weekData] = useState<Record<string, WorkoutTrackerState | null>>(() => {
    if (typeof window === 'undefined') return {}
    const days = getPast7Days()
    const data: Record<string, WorkoutTrackerState | null> = {}
    for (const day of days) {
      data[day] = getWorkoutState(day)
    }
    return data
  })

  const todayState = weekData[today]
  const totalSessions = Object.values(weekData).reduce((acc, s) => {
    if (!s) return acc
    return acc + (s.indoor.done ? 1 : 0) + (s.outdoor.done ? 1 : 0)
  }, 0)
  const fullDays = Object.values(weekData).filter(s => s?.indoor.done && s?.outdoor.done).length
  const completionRate = Math.round((totalSessions / 14) * 100)

  const fitnessStats = [
    { label: t('fitness.stat.sessions'),   num: totalSessions,  suffix: '',  icon: '🏋️', grad: 'linear-gradient(135deg, #5fd6a3 0%, #20a06b 100%)', glow: 'rgba(32, 160, 107, 0.35)' },
    { label: t('fitness.stat.full_days'),  num: fullDays,       suffix: '',  icon: '✅', grad: 'linear-gradient(135deg, #5ad1c4 0%, #1f9c8f 100%)', glow: 'rgba(31, 156, 143, 0.35)' },
    { label: t('fitness.stat.completion'), num: completionRate, suffix: '%', icon: '📊', grad: 'linear-gradient(135deg, #8fd06a 0%, #459e2f 100%)', glow: 'rgba(69, 158, 47, 0.35)' },
  ]

  return (
    <div className="relative">
      <Aurora />
      <div className="relative z-10 space-y-6 max-w-4xl mx-auto">
      {/* Header — gradient hero */}
      <ScrollReveal>
        <div
          className="living-gradient relative overflow-hidden rounded-[2rem] p-7 md:p-8"
          style={{
            background: 'linear-gradient(120deg, #d6f5e2 0%, #c4eed8 42%, #cdeee6 72%, #dbeaff 100%)',
            boxShadow: '0 24px 60px -28px rgba(32, 160, 107, 0.42)',
          }}
        >
          <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.6), transparent 70%)' }} />
          <div className="pointer-events-none absolute -left-12 -bottom-20 h-56 w-56 rounded-full" style={{ background: 'radial-gradient(circle, rgba(32,160,107,0.16), transparent 70%)' }} />
          <span className="shine-sweep" />
          <div className="relative">
            <span className="inline-block h-1.5 w-12 rounded-full mb-4" style={{ background: 'linear-gradient(90deg, #5fd6a3, #20a06b)' }} />
            <h1 className="text-4xl md:text-5xl font-bold leading-[1.05] text-[#2d3142]">{t('fitness.title')}</h1>
            <p className="text-[#2d3142]/70 mt-2">{t('fitness.subtitle')}</p>
          </div>
        </div>
      </ScrollReveal>

      {/* Today's session status */}
      <ScrollReveal delay={0.05}>
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t('fitness.today')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['indoor', 'outdoor'] as const).map(type => {
            const done = todayState?.[type].done ?? false
            return (
              <Card key={type}>
                <CardContent className="flex items-center gap-3 pt-4 pb-4">
                  {done
                    ? <CheckCircle2 className="h-8 w-8 text-primary shrink-0" />
                    : <Circle className="h-8 w-8 text-muted-foreground shrink-0" />
                  }
                  <div>
                    <p className="font-semibold text-sm">
                      {type === 'indoor' ? `🏠 ${t('fitness.indoor')}` : `🌤️ ${t('fitness.outdoor')}`} · {t('fitness.min')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {done ? t('fitness.done') : t('fitness.not_done')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
      </ScrollReveal>

      {/* 7-day grid */}
      <ScrollReveal>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('fitness.this_week')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {getPast7Days().map(day => {
              const s = weekData[day]
              const isToday = day === today
              const dayLabel = new Date(day + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' })
              return (
                <div key={day} className="flex flex-col items-center gap-1.5">
                  <span className={`text-[10px] font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    {dayLabel}
                  </span>
                  <div
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${s?.indoor.done ? 'bg-primary' : 'bg-muted'}`}
                    title="Indoor"
                  />
                  <div
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${s?.outdoor.done ? 'bg-primary' : 'bg-muted'}`}
                    title="Outdoor"
                  />
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">{t('fitness.dot_legend')}</p>
        </CardContent>
      </Card>
      </ScrollReveal>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {fitnessStats.map((stat, i) => (
          <Pop key={stat.label} delay={i * 0.1}>
            <Tilt>
              <div
                className="tile-pulse relative overflow-hidden rounded-3xl p-5 text-center text-white"
                style={{ background: stat.grad, boxShadow: `0 16px 34px -14px ${stat.glow}`, animationDelay: `${i * 0.5}s` }}
              >
                <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
                <span className="shine-sweep" />
                <div className="relative text-3xl mb-1 drop-shadow-sm">{stat.icon}</div>
                <div className="relative text-4xl font-bold leading-none tracking-tight tabular-nums">
                  <CountUp value={stat.num} />{stat.suffix}
                </div>
                <div className="relative text-xs font-medium uppercase tracking-wide text-white/80 mt-1.5">{stat.label}</div>
              </div>
            </Tilt>
          </Pop>
        ))}
      </div>

      {/* Outdoor + Indoor workout sections */}
      <ScrollReveal><OutdoorWorkout /></ScrollReveal>
      <ScrollReveal><IndoorWorkout /></ScrollReveal>
      </div>
    </div>
  )
}
