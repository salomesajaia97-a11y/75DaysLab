'use client'
import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { getProfile } from '@/lib/storage'
import type { ExerciseLevel, ExerciseFocus, Gender } from '@/lib/fitness/exerciseLottieRegistry'
import {
  getCatalogByLevel,
  resolveGender,
  type CatalogExercise,
} from '@/lib/fitness/workoutPlans'
import { ExerciseCard } from './ExerciseCard'
import { ExerciseDetailModal } from './ExerciseDetailModal'
import { SessionRunner } from './SessionRunner'

const LEVELS: ExerciseLevel[] = ['beginner', 'intermediate', 'advanced']
const LEVEL_LABEL: Record<ExerciseLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

interface Props {
  /** optional focus filter driven by FocusAreaChips */
  focusFilter?: ExerciseFocus | null
}

export function ExerciseLibrary({ focusFilter = null }: Props) {
  const [gender, setGender] = useState<Gender>('male')
  const [selected, setSelected] = useState<CatalogExercise | null>(null)
  const [open, setOpen] = useState(false)
  const [runnerEx, setRunnerEx] = useState<CatalogExercise | null>(null)
  const [runnerOpen, setRunnerOpen] = useState(false)

  useEffect(() => {
    // pick the animation set from the saved profile gender (hydration-safe)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGender(resolveGender(getProfile()?.gender))
  }, [])

  const openDetails = (ex: CatalogExercise) => {
    setSelected(ex)
    setOpen(true)
  }

  const startSession = (ex: CatalogExercise) => {
    setOpen(false)          // close detail modal
    setRunnerEx(ex)
    setRunnerOpen(true)     // open guided runner for this single exercise
  }

  // stable array identity so the runner's timer effect isn't reset on re-render
  const runnerExercises = useMemo(() => (runnerEx ? [runnerEx] : []), [runnerEx])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">🏃 Exercise Library</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Guided animations for every level.
            </p>
          </div>
          {/* Gender toggle for the animation figure */}
          <div className="inline-flex rounded-xl border border-border p-0.5">
            {(['female', 'male'] as const).map(g => (
              <button
                key={g}
                type="button"
                aria-pressed={gender === g}
                onClick={() => setGender(g)}
                className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  gender === g ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="beginner">
          <TabsList className="w-full">
            {LEVELS.map(level => (
              <TabsTrigger key={level} value={level} className="flex-1">
                {LEVEL_LABEL[level]}
              </TabsTrigger>
            ))}
          </TabsList>

          {LEVELS.map(level => {
            let list = getCatalogByLevel(level)
            if (focusFilter) list = list.filter(e => e.focus.includes(focusFilter))
            return (
              <TabsContent key={level} value={level} className="pt-4">
                {list.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No {LEVEL_LABEL[level].toLowerCase()} exercises for this focus.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                    {list.map(ex => (
                      <ExerciseCard
                        key={ex.slug}
                        exercise={ex}
                        gender={gender}
                        onDetails={openDetails}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      </CardContent>

      <ExerciseDetailModal
        exercise={selected}
        gender={gender}
        open={open}
        onOpenChange={setOpen}
        onStartSession={startSession}
      />

      {runnerEx && (
        <SessionRunner
          open={runnerOpen}
          onOpenChange={setRunnerOpen}
          title={runnerEx.name}
          source="exercise"
          exercises={runnerExercises}
          gender={gender}
        />
      )}
    </Card>
  )
}
