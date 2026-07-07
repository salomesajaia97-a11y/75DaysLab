'use client'
import { useEffect, useState } from 'react'
import { Home, Dumbbell, ArrowLeft, ArrowRight, Sparkles, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getProfile } from '@/lib/storage'
import { useLanguage } from '@/lib/i18n'
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
import { difficultyLabel, goalLabel, equipmentLabel, locationLabel } from '@/lib/fitness/i18n'
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
      aria-pressed={active}
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
  const { t, locale } = useLanguage()
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
        <CardTitle className="text-base">{t('fitness.wizard_title')}</CardTitle>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {plan ? t('fitness.wizard_ready') : t('fitness.wizard_desc')}
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {plan ? (
          <>
            <WeeklyPlanPreview plan={plan} gender={gender} onOpenDetail={openDetail} />
            <Button variant="outline" className="w-full" onClick={startOver}>
              <RotateCcw className="h-4 w-4" /> {t('fitness.wizard_build_another')}
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
                {t('fitness.wizard_step_of', { current: stepIndex + 1, total: steps.length })}
              </p>
              <h3 className="mt-0.5 text-lg font-semibold font-heading">{t(`fitness.step_${step.id}`)}</h3>
            </div>

            {/* step body */}
            <div className="min-h-[92px]">
              {step.id === 'location' && (
                <div className="flex flex-wrap gap-1.5">
                  {(['home', 'gym'] as WorkoutLocation[]).map(loc => (
                    <Seg key={loc} active={sel.location === loc} onClick={() => setField('location', loc)}>
                      <span className="inline-flex items-center gap-1.5">
                        {loc === 'home' ? <Home className="h-3.5 w-3.5" /> : <Dumbbell className="h-3.5 w-3.5" />}
                        {loc === 'home' ? t('fitness.wizard_home_workout') : t('fitness.wizard_gym_workout')}
                      </span>
                    </Seg>
                  ))}
                </div>
              )}

              {step.id === 'goal' && (
                <div className="flex flex-wrap gap-1.5">
                  {GOAL_OPTIONS.map(g => (
                    <Seg key={g.id} active={sel.goal === g.id} onClick={() => setField('goal', g.id as PlanGoal)}>
                      {goalLabel(g.id, locale, g.label)}
                    </Seg>
                  ))}
                </div>
              )}

              {step.id === 'level' && (
                <div className="flex flex-wrap gap-1.5">
                  {LEVELS.map(lv => (
                    <Seg key={lv} active={sel.level === lv} onClick={() => setField('level', lv)}>
                      {difficultyLabel(lv, locale, DIFFICULTY_LABEL[lv])}
                    </Seg>
                  ))}
                </div>
              )}

              {step.id === 'time' && (
                <div className="flex flex-wrap gap-1.5">
                  {MINUTES.map(m => (
                    <Seg key={m} active={sel.minutes === m} onClick={() => setField('minutes', m)}>
                      {t('fitness.min_n', { n: m })}
                    </Seg>
                  ))}
                </div>
              )}

              {step.id === 'days' && (
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map(d => (
                    <Seg key={d} active={sel.daysPerWeek === d} onClick={() => setField('daysPerWeek', d)}>
                      {t('fitness.days_n', { n: d })}
                    </Seg>
                  ))}
                </div>
              )}

              {step.id === 'equipment' && (
                <div className="flex flex-wrap gap-1.5">
                  {EQUIPMENT_OPTIONS.map(e => (
                    <Seg key={e.id} active={sel.equipment === e.id} onClick={() => setField('equipment', e.id as Equipment)}>
                      {equipmentLabel(e.id, locale, e.label)}
                    </Seg>
                  ))}
                </div>
              )}

              {step.id === 'review' && (
                <div className="space-y-1.5">
                  <SummaryRow label={t('fitness.review_location')} value={locationLabel(sel.location, locale)} />
                  <SummaryRow label={t('fitness.review_goal')} value={goalLabel(sel.goal, locale, GOAL_LABEL[sel.goal])} />
                  <SummaryRow label={t('fitness.review_level')} value={difficultyLabel(sel.level, locale, DIFFICULTY_LABEL[sel.level])} />
                  <SummaryRow label={t('fitness.review_session_length')} value={t('fitness.min_n', { n: sel.minutes })} />
                  <SummaryRow label={t('fitness.review_days_per_week')} value={t('fitness.days_n', { n: sel.daysPerWeek })} />
                  <SummaryRow
                    label={t('fitness.review_equipment')}
                    value={equipmentLabel(sel.equipment, locale, EQUIPMENT_OPTIONS.find(e => e.id === sel.equipment)?.label ?? sel.equipment)}
                  />
                </div>
              )}
            </div>

            {/* footer nav */}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={w.back} disabled={atFirst}>
                <ArrowLeft className="h-4 w-4" /> {t('fitness.back')}
              </Button>
              {isReview ? (
                <Button className="flex-1" onClick={generate}>
                  <Sparkles className="h-4 w-4" /> {t('fitness.wizard_generate')}
                </Button>
              ) : (
                <Button className="flex-1" onClick={w.next} disabled={!canProceed}>
                  {t('fitness.next')} <ArrowRight className="h-4 w-4" />
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
