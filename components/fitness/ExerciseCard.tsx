'use client'
import { CheckCircle2, Info, Clock, Repeat } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DIFFICULTY_LABEL,
  EQUIPMENT_OPTIONS,
  exerciseMinutes,
  type CatalogExercise,
} from '@/lib/fitness/workoutPlans'
import { getExerciseMedia } from '@/lib/fitness/exerciseMedia'
import { localizeExercise, difficultyLabel, equipmentLabel as geEquipmentLabel } from '@/lib/fitness/i18n'
import { useLanguage } from '@/lib/i18n'
import type { Gender } from '@/lib/fitness/exerciseLottieRegistry'
import { useMarkComplete } from '@/hooks/useMarkComplete'
import { ExerciseThumb } from './ExerciseThumb'

interface Props {
  exercise: CatalogExercise
  gender: Gender
  onDetails: (exercise: CatalogExercise) => void
}

function equipmentEn(id: string) {
  return EQUIPMENT_OPTIONS.find(e => e.id === id)?.label ?? id
}

export function ExerciseCard({ exercise: rawExercise, gender, onDetails }: Props) {
  const { t, locale } = useLanguage()
  const { done, markComplete } = useMarkComplete()
  const exercise = localizeExercise(rawExercise, locale)
  const media = getExerciseMedia(exercise.slug, gender)
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition-shadow hover:shadow-md">
      <ExerciseThumb focus={exercise.focus} media={media} className="h-32" size={64} />

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold leading-tight">{exercise.name}</h4>
          <Badge variant="secondary" className="shrink-0">{difficultyLabel(exercise.level, locale, DIFFICULTY_LABEL[exercise.level])}</Badge>
        </div>

        <p className="text-xs text-muted-foreground">{exercise.targetMuscles.join(' · ')}</p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{exercise.durationSec}s</span>
          <span className="inline-flex items-center gap-1"><Repeat className="h-3 w-3" />{exercise.sets} × {exercise.reps}</span>
        </div>

        <Badge variant="outline" className="w-fit">{geEquipmentLabel(exercise.equipment, locale, equipmentEn(exercise.equipment))}</Badge>

        <div className="mt-auto flex gap-2 pt-1">
          <Button
            size="sm"
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
            <CheckCircle2 className="h-3.5 w-3.5" /> {done ? t('fitness.done_short') : t('fitness.complete_short')}
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => onDetails(rawExercise)}>
            <Info className="h-3.5 w-3.5" /> {t('fitness.details')}
          </Button>
        </div>
      </div>
    </div>
  )
}
