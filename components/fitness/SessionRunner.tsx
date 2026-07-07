'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, CheckCircle2, Repeat } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { todayString } from '@/lib/storage'
import { logWorkout, type WorkoutSource } from '@/lib/fitness/workoutLog'
import { exerciseMinutes, thumbLottieFor, type CatalogExercise } from '@/lib/fitness/workoutPlans'
import { localizeExercise } from '@/lib/fitness/i18n'
import type { Gender } from '@/lib/fitness/exerciseLottieRegistry'
import { useLanguage } from '@/lib/i18n'
import { ExerciseThumb } from './ExerciseThumb'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  source: WorkoutSource
  exercises: CatalogExercise[]
  gender: Gender
}

function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const r = (s % 60).toString().padStart(2, '0')
  return `${m}:${r}`
}

/**
 * Minimal guided workout player. Steps through a session's exercises with a
 * simple countdown timer + rep target, Prev/Next, and Finish → logWorkout.
 * No audio / voice / advanced timing (deferred).
 */
export function SessionRunner({ open, onOpenChange, title, source, exercises, gender }: Props) {
  const { t, locale } = useLanguage()
  const [idx, setIdx] = useState(0)
  const [secs, setSecs] = useState(0)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)

  const cur = exercises[idx]
  const total = exercises.length

  // reset the whole run each time the modal opens
  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIdx(0); setFinished(false)
  }, [open])

  // reset the timer when the current exercise changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSecs(exercises[idx]?.durationSec ?? 30); setRunning(false)
  }, [idx, exercises])

  // tick — auto-stops when the countdown reaches zero
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      setSecs(s => {
        if (s <= 1) {
          setRunning(false)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [running])

  if (!cur) return null

  const lex = localizeExercise(cur, locale)
  const atFirst = idx === 0
  const atLast = idx === total - 1
  const lottieSrc = cur.lottieAvailable ? thumbLottieFor(cur.slug, gender) : null

  const finish = () => {
    if (finished) return
    setFinished(true)
    logWorkout({
      date: todayString(),
      kind: 'structured',
      source,
      title,
      exerciseSlugs: exercises.map(e => e.slug),
      minutes: exercises.reduce((a, e) => a + exerciseMinutes(e), 0),
    })
    toast.success(t('fitness.workout_complete_toast'), { description: title })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-heading">{title}</DialogTitle>
          <p className="text-xs text-muted-foreground">{t('fitness.exercise_of', { current: idx + 1, total })}</p>
        </DialogHeader>

        {/* progress dots */}
        <div className="flex items-center gap-1.5">
          {exercises.map((e, i) => (
            <span
              key={e.slug}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < idx ? 'bg-primary/50' : i === idx ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* animation / icon */}
        <div className="overflow-hidden rounded-2xl">
          <ExerciseThumb focus={cur.focus} lottieSrc={lottieSrc} className="h-52" size={72} />
        </div>

        {/* current exercise */}
        <div className="text-center">
          <h3 className="text-lg font-semibold">{lex.name}</h3>
          <p className="text-xs text-muted-foreground">{lex.targetMuscles.join(' · ')}</p>
          <div className="mt-1 flex items-center justify-center gap-2">
            <Badge variant="outline"><Repeat className="h-3 w-3" /> {lex.sets} × {lex.reps}</Badge>
          </div>
        </div>

        {/* timer */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-4xl font-bold tabular-nums">{fmt(secs)}</span>
          <div className="flex gap-2">
            <Button size="sm" variant={running ? 'outline' : 'default'} onClick={() => setRunning(r => !r)} disabled={secs === 0}>
              {running ? <><Pause className="h-4 w-4" /> {t('fitness.pause')}</> : <><Play className="h-4 w-4" /> {t('fitness.start')}</>}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setSecs(cur.durationSec); setRunning(false) }}>
              <RotateCcw className="h-4 w-4" /> {t('fitness.reset')}
            </Button>
          </div>
        </div>

        {/* nav */}
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={atFirst}>
            <ChevronLeft className="h-4 w-4" /> {t('fitness.prev')}
          </Button>
          {atLast ? (
            <Button className="flex-1" onClick={finish}>
              <CheckCircle2 className="h-4 w-4" /> {t('fitness.finish_workout')}
            </Button>
          ) : (
            <Button className="flex-1" onClick={() => setIdx(i => Math.min(total - 1, i + 1))}>
              {t('fitness.next')} <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* always-available finish for short sessions */}
        {!atLast && (
          <Button variant="ghost" className="w-full" onClick={finish}>
            {t('fitness.finish_mark_complete')}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
