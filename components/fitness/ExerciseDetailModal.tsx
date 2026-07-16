'use client'
import { useEffect } from 'react'
import { CheckCircle2, Repeat, Timer, Pause, Target, ShieldCheck, ArrowDownCircle, ArrowUpCircle, Dumbbell, Play } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LottiePlayer } from '@/components/ui/LottiePlayer'
import type { Gender } from '@/lib/fitness/exerciseLottieRegistry'
import {
  lottieFileFor,
  exerciseMinutes,
  DIFFICULTY_LABEL,
  EQUIPMENT_OPTIONS,
  type CatalogExercise,
} from '@/lib/fitness/workoutPlans'
import { localizeExercise, difficultyLabel, equipmentLabel as geEquipmentLabel } from '@/lib/fitness/i18n'
import { useLanguage } from '@/lib/i18n'
import { useMarkComplete } from '@/hooks/useMarkComplete'

interface Props {
  exercise: CatalogExercise | null
  gender: Gender
  open: boolean
  onOpenChange: (open: boolean) => void
  /** when provided, shows a "Start guided session" action for this exercise */
  onStartSession?: (exercise: CatalogExercise) => void
}

function equipmentEn(id: string) {
  return EQUIPMENT_OPTIONS.find(e => e.id === id)?.label ?? id
}

export function ExerciseDetailModal({ exercise: rawExercise, gender, open, onOpenChange, onStartSession }: Props) {
  const { t, locale } = useLanguage()
  const { done, markComplete, reset } = useMarkComplete()
  const slug = rawExercise?.slug
  // reset the completion guard whenever a different exercise is shown
  useEffect(() => { reset() }, [slug, reset])

  if (!rawExercise) return null
  const exercise = localizeExercise(rawExercise, locale)
  const file = lottieFileFor(exercise.slug, gender)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-heading">{exercise.name}</DialogTitle>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Badge variant="secondary">{difficultyLabel(exercise.level, locale, DIFFICULTY_LABEL[exercise.level])}</Badge>
            <Badge variant="outline">{geEquipmentLabel(exercise.equipment, locale, equipmentEn(exercise.equipment))}</Badge>
          </div>
        </DialogHeader>

        {/* Larger animation */}
        {file && (
          <div className="overflow-hidden rounded-2xl bg-muted">
            <LottiePlayer src={file} className="aspect-square" />
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          <Stat icon={<Repeat className="h-4 w-4" />} label={t('fitness.sets_reps')} value={`${exercise.sets} × ${exercise.reps}`} />
          <Stat icon={<Timer className="h-4 w-4" />} label={t('fitness.work')} value={`${exercise.durationSec}s`} />
          <Stat icon={<Pause className="h-4 w-4" />} label={t('fitness.rest')} value={`${exercise.restSec}s`} />
        </div>

        {/* Target muscles */}
        <Section icon={<Target className="h-4 w-4 text-primary" />} title={t('fitness.target_muscles')}>
          <div className="flex flex-wrap gap-1.5">
            {exercise.targetMuscles.map(m => (
              <Badge key={m} variant="outline">{m}</Badge>
            ))}
          </div>
        </Section>

        {/* Instructions */}
        <Section icon={<Dumbbell className="h-4 w-4 text-primary" />} title={t('fitness.how_to')}>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {exercise.instructions.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </Section>

        {/* Safety tips */}
        <Section icon={<ShieldCheck className="h-4 w-4 text-primary" />} title={t('fitness.safety_tips')}>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {exercise.safetyTips.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </Section>

        {/* Modifications */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
              <ArrowDownCircle className="h-4 w-4 text-primary" /> {t('fitness.beginner')}
            </p>
            <p className="text-xs text-muted-foreground">{exercise.beginnerModification}</p>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
              <ArrowUpCircle className="h-4 w-4 text-primary" /> {t('fitness.advanced')}
            </p>
            <p className="text-xs text-muted-foreground">{exercise.advancedOption}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {onStartSession && (
            <Button variant="outline" className="flex-1" onClick={() => onStartSession(rawExercise)}>
              <Play className="h-4 w-4" /> {t('fitness.start_session')}
            </Button>
          )}
          <Button
            className="flex-1"
            variant={done ? 'outline' : 'default'}
            disabled={done}
            onClick={() =>
              markComplete({
                kind: 'structured',
                source: 'exercise',
                title: exercise.name,
                exerciseSlugs: [exercise.slug],
                minutes: exerciseMinutes(exercise),
              })
            }
          >
            <CheckCircle2 className="h-4 w-4" /> {done ? t('fitness.completed') : t('fitness.mark_complete')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-2.5 text-center">
      <div className="mb-1 flex justify-center text-primary">{icon}</div>
      <div className="text-sm font-semibold leading-tight">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">{icon}{title}</p>
      {children}
    </div>
  )
}
