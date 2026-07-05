'use client'
import { useCallback, useMemo, useState } from 'react'
import type {
  BuilderSelection,
  Equipment,
  PlanGoal,
  WorkoutLocation,
} from '@/lib/fitness/workoutPlans'
import type { ExerciseLevel } from '@/lib/fitness/exerciseLottieRegistry'

export type WizardStepId =
  | 'location' | 'goal' | 'level' | 'time' | 'days' | 'equipment' | 'review'

export const WIZARD_STEPS: { id: WizardStepId; title: string }[] = [
  { id: 'location', title: 'Where are you training?' },
  { id: 'goal', title: 'What is your goal?' },
  { id: 'level', title: 'Your experience level' },
  { id: 'time', title: 'Session length' },
  { id: 'days', title: 'Days per week' },
  { id: 'equipment', title: 'Available equipment' },
  { id: 'review', title: 'Review your plan' },
]

const DEFAULT_SELECTION: BuilderSelection = {
  location: 'home',
  goal: 'full-body',
  level: 'beginner',
  minutes: 30,
  daysPerWeek: 3,
  equipment: 'none',
}

/** Per-step validation — the field for that step must be set before Next. */
function isStepValid(id: WizardStepId, sel: BuilderSelection): boolean {
  switch (id) {
    case 'location': return sel.location != null
    case 'goal': return sel.goal != null
    case 'level': return sel.level != null
    case 'time': return sel.minutes != null
    case 'days': return sel.daysPerWeek != null
    case 'equipment': return sel.equipment != null
    case 'review': return true
  }
}

export function useWorkoutWizard(initial: Partial<BuilderSelection> = {}) {
  const [selection, setSelection] = useState<BuilderSelection>({ ...DEFAULT_SELECTION, ...initial })
  const [stepIndex, setStepIndex] = useState(0)

  const step = WIZARD_STEPS[stepIndex]
  const atFirst = stepIndex === 0
  const atLast = stepIndex === WIZARD_STEPS.length - 1
  const isReview = step.id === 'review'
  const canProceed = useMemo(() => isStepValid(step.id, selection), [step.id, selection])

  const setField = useCallback(
    <K extends keyof BuilderSelection>(k: K, v: BuilderSelection[K]) =>
      setSelection(prev => ({ ...prev, [k]: v })),
    [],
  )

  const next = useCallback(() => {
    setStepIndex(i => (isStepValid(WIZARD_STEPS[i].id, selection) ? Math.min(i + 1, WIZARD_STEPS.length - 1) : i))
  }, [selection])

  const back = useCallback(() => setStepIndex(i => Math.max(i - 1, 0)), [])
  const goTo = useCallback((i: number) => setStepIndex(Math.max(0, Math.min(i, WIZARD_STEPS.length - 1))), [])
  const reset = useCallback(() => setStepIndex(0), [])

  return {
    steps: WIZARD_STEPS,
    stepIndex,
    step,
    selection,
    setField,
    next,
    back,
    goTo,
    reset,
    atFirst,
    atLast,
    isReview,
    canProceed,
  }
}

export type { BuilderSelection, WorkoutLocation, PlanGoal, Equipment, ExerciseLevel }
