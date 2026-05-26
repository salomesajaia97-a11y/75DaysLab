'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StreakCounter } from '@/components/streak/StreakCounter'
import { WaterTracker } from '@/components/water/WaterTracker'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Task {
  id: string
  label: string
  done: boolean
}

const INITIAL_TASKS: Task[] = [
  { id: 'water', label: 'Drink daily water goal', done: false },
  { id: 'journal', label: 'Read 10 pages', done: false },
  { id: 'workout', label: 'Complete workout', done: false },
  { id: 'nutrition', label: 'Log all meals', done: false },
  { id: 'photo', label: 'Upload progress photo', done: false },
]

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS)
  const streak = { day: 1, totalDays: 75 }
  const completedCount = tasks.filter(t => t.done).length
  const allDone = completedCount === tasks.length

  function toggleTask(id: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Good morning</h1>
          <p className="text-muted-foreground mt-1">Stay consistent. Every day counts.</p>
          {allDone && (
            <Badge className="mt-2 bg-green-500/20 text-green-400 border-green-500/30">
              <Flame className="h-3 w-3 mr-1" /> Day complete! 🎉
            </Badge>
          )}
        </div>
        <StreakCounter day={streak.day} totalDays={streak.totalDays} />
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Daily Progress</span>
          <span>{completedCount}/{tasks.length} tasks</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / tasks.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Water widget */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Hydration</CardTitle></CardHeader>
          <CardContent className="flex justify-center py-2">
            <WaterTracker consumedMl={0} goalMl={2500} />
          </CardContent>
        </Card>

        {/* Task checklist */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Today&apos;s Tasks</CardTitle></CardHeader>
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

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Current Streak', value: '1 day', icon: '🔥' },
          { label: 'Best Streak', value: '1 day', icon: '🏆' },
          { label: 'Days Left', value: '74 days', icon: '📅' },
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
