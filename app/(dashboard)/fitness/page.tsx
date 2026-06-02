'use client'
import { useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getWorkoutState, todayString } from '@/lib/storage'
import type { WorkoutTrackerState } from '@/types'

function getPast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

export default function FitnessPage() {
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Fitness</h1>
        <p className="text-muted-foreground mt-1">Your 75 Hard workout progress</p>
      </div>

      {/* Today's session status */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Today</h2>
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
                      {type === 'indoor' ? '🏠 Indoor' : '🌤️ Outdoor'} · 45 min
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {done ? 'Completed today' : 'Not done yet'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* 7-day grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">This Week</CardTitle>
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
          <p className="text-xs text-muted-foreground mt-3">Top dot = indoor · Bottom dot = outdoor</p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Sessions This Week', value: `${totalSessions}`, icon: '🏋️' },
          { label: 'Full Days This Week', value: `${fullDays}`, icon: '✅' },
          { label: 'Completion Rate', value: `${completionRate}%`, icon: '📊' },
        ].map(stat => (
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
