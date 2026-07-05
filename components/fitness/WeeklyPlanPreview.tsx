'use client'
import { useState } from 'react'
import { Clock, CheckCircle2, ChevronRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DIFFICULTY_LABEL, type WeeklyPlan, type DayPlan, type CatalogExercise } from '@/lib/fitness/workoutPlans'
import type { Gender } from '@/lib/fitness/exerciseLottieRegistry'
import { useMarkComplete } from '@/hooks/useMarkComplete'
import { ExerciseThumb } from './ExerciseThumb'
import { SessionRunner } from './SessionRunner'

interface Props {
  plan: WeeklyPlan
  gender: Gender
  onOpenDetail: (ex: CatalogExercise) => void
}

export function WeeklyPlanPreview({ plan, gender, onOpenDetail }: Props) {
  const [runnerDay, setRunnerDay] = useState<DayPlan | null>(null)
  const [runnerOpen, setRunnerOpen] = useState(false)

  const startDay = (day: DayPlan) => { setRunnerDay(day); setRunnerOpen(true) }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="text-base font-semibold">Your weekly plan</span>
        <span className="text-muted-foreground">{plan.days.length} sessions / week</span>
        <Badge variant="secondary">{DIFFICULTY_LABEL[plan.selection.level]}</Badge>
      </div>

      <div className="space-y-3">
        {plan.days.map(day => (
          <DayCard key={day.index} day={day} onOpenDetail={onOpenDetail} onStart={startDay} />
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Warm up before each session and stop if anything hurts. Tap an exercise for full instructions.
      </p>

      {runnerDay && (
        <SessionRunner
          open={runnerOpen}
          onOpenChange={setRunnerOpen}
          title={`${runnerDay.label} session (Day ${runnerDay.index})`}
          source="builder"
          exercises={runnerDay.exercises}
          gender={gender}
        />
      )}
    </div>
  )
}

function DayCard({
  day,
  onOpenDetail,
  onStart,
}: {
  day: DayPlan
  onOpenDetail: (ex: CatalogExercise) => void
  onStart: (day: DayPlan) => void
}) {
  const { done, markComplete } = useMarkComplete()

  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          Day {day.index} · {day.label}
        </p>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />~{day.minutes} min
        </span>
      </div>

      <div className="space-y-1.5">
        {day.exercises.map(ex => (
          <button
            key={ex.slug}
            type="button"
            onClick={() => onOpenDetail(ex)}
            className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-1.5 text-left transition-colors hover:bg-muted"
          >
            {/* tiny row thumbs use the clean icon — Lottie is illegible at this size */}
            <ExerciseThumb focus={ex.focus} className="h-10 w-10 shrink-0 rounded-lg" size={22} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{ex.name}</span>
              <span className="block text-xs text-muted-foreground">{ex.sets} × {ex.reps} · {ex.targetMuscles[0]}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={() => onStart(day)}>
          <Play className="h-3.5 w-3.5" /> Start
        </Button>
        <Button
          size="sm"
          className="flex-1"
          variant={done ? 'outline' : 'default'}
          disabled={done}
          onClick={() =>
            markComplete({
              kind: 'structured',
              source: 'builder',
              title: `${day.label} session (Day ${day.index})`,
              exerciseSlugs: day.exercises.map(e => e.slug),
              minutes: day.minutes,
            })
          }
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> {done ? 'Completed' : 'Mark complete'}
        </Button>
      </div>
    </div>
  )
}
