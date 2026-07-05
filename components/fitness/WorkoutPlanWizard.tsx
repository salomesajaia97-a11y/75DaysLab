'use client'
import { useEffect, useState } from 'react'
import { Home, Dumbbell, ArrowLeft, ArrowRight, Sparkles, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getProfile } from '@/lib/storage'
import type { Gender } from '@/lib/fitness/exerciseLottieRegistry'
import {
  generateWeeklyPlan,
  resolveGender,
  GOAL_OPTIONS,
  EQUIPMENT_OPTIONS,
  DIFFICULTY_LABEL,
  GOAL_LABEL,
  type WeeklyPlan,
  type CatalogExercise,
  type WorkoutLocation,
  type PlanGoal,
  type Equipment,
} from '@/lib/fitness/workoutPlans'
import type { ExerciseLevel } from '@/lib/fitness/exerciseLottieRegistry'
import { useWorkoutWizard } from '@/hooks/useWorkoutWizard'
import { ExerciseDetailModal } from './ExerciseDetailModal'
import { WeeklyPlanPreview } from './WeeklyPlanPreview'

const LEVELS: ExerciseLevel[] = ['beginner', 'intermediate', 'advanced']
const MINUTES = [15, 30, 45, 60] as const
const DAYS = [2, 3, 4, 5] as const

function Seg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

export function WorkoutPlanWizard() {
  const w = useWorkoutWizard()
  const { selection: sel, setField, step, stepIndex, steps, atFirst, isReview, canProceed } = w

  const [gender, setGender] = useState<Gender>('male')
  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [detail, setDetail] = useState<CatalogExercise | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // hydration-safe profile read → selects the animation set
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGender(resolveGender(getProfile()?.gender))
  }, [])

  const generate = () => setPlan(generateWeeklyPlan(sel))
  const startOver = () => { setPlan(null); w.reset() }
  const openDetail = (ex: CatalogExercise) => { setDetail(ex); setOpen(true) }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">🧩 Workout Plan Wizard</CardTitle>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {plan ? 'Your personalized weekly plan.' : 'A few quick questions and we’ll build your week.'}
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {plan ? (
          <>
            <WeeklyPlanPreview plan={plan} gender={gender} onOpenDetail={openDetail} />
            <Button variant="outline" className="w-full" onClick={startOver}>
              <RotateCcw className="h-4 w-4" /> Build another plan
            </Button>
          </>
        ) : (
          <>
            {/* progress dots */}
            <div className="flex items-center justify-center gap-2">
              {steps.map((s, i) => (
                <span
                  key={s.id}
                  className={`h-2 rounded-full transition-all ${
                    i === stepIndex ? 'w-6 bg-primary' : i < stepIndex ? 'w-2 bg-primary/50' : 'w-2 bg-muted'
                  }`}
                />
              ))}
            </div>

            {/* step title */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Step {stepIndex + 1} of {steps.length}
              </p>
              <h3 className="mt-0.5 text-lg font-semibold font-heading">{step.title}</h3>
            </div>

            {/* step body */}
            <div className="min-h-[92px]">
              {step.id === 'location' && (
                <div className="flex flex-wrap gap-1.5">
                  {(['home', 'gym'] as WorkoutLocation[]).map(loc => (
                    <Seg key={loc} active={sel.location === loc} onClick={() => setField('location', loc)}>
                      <span className="inline-flex items-center gap-1.5">
                        {loc === 'home' ? <Home className="h-3.5 w-3.5" /> : <Dumbbell className="h-3.5 w-3.5" />}
                        {loc === 'home' ? 'Home Workout' : 'Gym Workout'}
                      </span>
                    </Seg>
                  ))}
                </div>
              )}

              {step.id === 'goal' && (
                <div className="flex flex-wrap gap-1.5">
                  {GOAL_OPTIONS.map(g => (
                    <Seg key={g.id} active={sel.goal === g.id} onClick={() => setField('goal', g.id as PlanGoal)}>
                      {g.label}
                    </Seg>
                  ))}
                </div>
              )}

              {step.id === 'level' && (
                <div className="flex flex-wrap gap-1.5">
                  {LEVELS.map(lv => (
                    <Seg key={lv} active={sel.level === lv} onClick={() => setField('level', lv)}>
                      {DIFFICULTY_LABEL[lv]}
                    </Seg>
                  ))}
                </div>
              )}

              {step.id === 'time' && (
                <div className="flex flex-wrap gap-1.5">
                  {MINUTES.map(m => (
                    <Seg key={m} active={sel.minutes === m} onClick={() => setField('minutes', m)}>
                      {m} min
                    </Seg>
                  ))}
                </div>
              )}

              {step.id === 'days' && (
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map(d => (
                    <Seg key={d} active={sel.daysPerWeek === d} onClick={() => setField('daysPerWeek', d)}>
                      {d} days
                    </Seg>
                  ))}
                </div>
              )}

              {step.id === 'equipment' && (
                <div className="flex flex-wrap gap-1.5">
                  {EQUIPMENT_OPTIONS.map(e => (
                    <Seg key={e.id} active={sel.equipment === e.id} onClick={() => setField('equipment', e.id as Equipment)}>
                      {e.label}
                    </Seg>
                  ))}
                </div>
              )}

              {step.id === 'review' && (
                <div className="space-y-1.5">
                  <SummaryRow label="Location" value={sel.location === 'home' ? 'Home' : 'Gym'} />
                  <SummaryRow label="Goal" value={GOAL_LABEL[sel.goal]} />
                  <SummaryRow label="Level" value={DIFFICULTY_LABEL[sel.level]} />
                  <SummaryRow label="Session length" value={`${sel.minutes} min`} />
                  <SummaryRow label="Days per week" value={`${sel.daysPerWeek} days`} />
                  <SummaryRow
                    label="Equipment"
                    value={EQUIPMENT_OPTIONS.find(e => e.id === sel.equipment)?.label ?? sel.equipment}
                  />
                </div>
              )}
            </div>

            {/* footer nav */}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={w.back} disabled={atFirst}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              {isReview ? (
                <Button className="flex-1" onClick={generate}>
                  <Sparkles className="h-4 w-4" /> Generate Plan
                </Button>
              ) : (
                <Button className="flex-1" onClick={w.next} disabled={!canProceed}>
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>

      <ExerciseDetailModal exercise={detail} gender={gender} open={open} onOpenChange={setOpen} />
    </Card>
  )
}
