'use client'
import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { CycleCalendar, LS_KEY } from '@/components/cycle/CycleCalendar'
import { ScrollReveal, Aurora } from '@/components/shared/Motion'
import { useLanguage } from '@/lib/i18n'
import { Heart } from 'lucide-react'

const CYCLE_LENGTH = 28
const PERIOD_LENGTH = 5

function buildPredictions(fromStart?: Date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let nextPeriod: Date
  if (fromStart) {
    nextPeriod = new Date(fromStart)
    nextPeriod.setDate(fromStart.getDate() + CYCLE_LENGTH)
  } else {
    nextPeriod = new Date(today)
    nextPeriod.setDate(today.getDate() + 7)
  }

  const ovulation = new Date(nextPeriod)
  ovulation.setDate(nextPeriod.getDate() - 14)

  const periodDates = Array.from({ length: PERIOD_LENGTH }, (_, i) => {
    const d = new Date(nextPeriod)
    d.setDate(nextPeriod.getDate() + i)
    return d
  })

  const fertileDates = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(ovulation)
    d.setDate(ovulation.getDate() - 5 + i)
    return d
  })

  const msPerDay = 1000 * 60 * 60 * 24
  const daysUntilPeriod = Math.max(0, Math.round((nextPeriod.getTime() - today.getTime()) / msPerDay))

  return { periodDates, ovulationDate: ovulation, fertileDates, daysUntilPeriod }
}

function getTrainingTip(daysUntil: number): string {
  if (daysUntil <= 5)  return "You're in your menstrual phase — rest and gentle movement recommended."
  if (daysUntil <= 13) return "You're in the follicular phase — great time for high-intensity workouts!"
  if (daysUntil <= 16) return "You're in the ovulation phase — peak energy, push your limits!"
  return "You're in the luteal phase — focus on strength and moderate cardio."
}

export default function CyclePage() {
  const { t } = useLanguage()
  const [predictions, setPredictions] = useState(() => buildPredictions())

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (!saved) return
      const { start } = JSON.parse(saved)
      setPredictions(buildPredictions(new Date(start)))
    } catch {}
  }, [])

  const handlePeriodLogged = useCallback((start: Date) => {
    setPredictions(buildPredictions(start))
  }, [])

  const handlePeriodCleared = useCallback(() => {
    setPredictions(buildPredictions())
  }, [])

  const tip = getTrainingTip(predictions.daysUntilPeriod)

  return (
    <div className="relative">
      <Aurora />
      <div className="relative z-10 max-w-lg mx-auto space-y-4 p-4">
      <ScrollReveal>
        <div
          className="living-gradient relative overflow-hidden rounded-[2rem] p-7 md:p-8"
          style={{
            background: 'linear-gradient(120deg, #ffe0ec 0%, #ffd4e3 44%, #ffe0ef 74%, #f0e0ff 100%)',
            boxShadow: '0 24px 60px -28px rgba(225, 70, 130, 0.42)',
          }}
        >
          <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.6), transparent 70%)' }} />
          <div className="pointer-events-none absolute -left-12 -bottom-20 h-56 w-56 rounded-full" style={{ background: 'radial-gradient(circle, rgba(225,70,130,0.16), transparent 70%)' }} />
          <span className="shine-sweep" />
          <div className="relative flex items-center gap-3">
            <Heart className="h-7 w-7 text-rose-500" strokeWidth={1.6} />
            <h1 className="text-4xl md:text-5xl font-bold leading-[1.05] text-[#2d3142]">{t('cycle.title')}</h1>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.05}>
      <Card
        className="border-0"
        style={{
          background: 'rgba(255,255,255,0.68)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 2px 24px rgba(0,0,0,0.06)',
          borderRadius: 24,
        }}
      >
        <CardContent className="pt-5 pb-4">
          <CycleCalendar
            predictions={predictions}
            onPeriodLogged={handlePeriodLogged}
            onPeriodCleared={handlePeriodCleared}
          />
        </CardContent>
      </Card>
      </ScrollReveal>

      <ScrollReveal>
      <Card>
        <CardContent className="pt-5 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">Next Period</span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-500 dark:bg-rose-950 dark:text-rose-300">
              {predictions.daysUntilPeriod} days
            </span>
          </div>
          <div className="h-px bg-border" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Cycle Length</p>
              <p className="text-sm font-medium">{CYCLE_LENGTH} days</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Period Length</p>
              <p className="text-sm font-medium">{PERIOD_LENGTH} days</p>
            </div>
          </div>
        </CardContent>
      </Card>
      </ScrollReveal>

      <ScrollReveal>
        <div className="rounded-2xl bg-muted px-4 py-3">
          <p className="text-sm">
            <span className="mr-1">💪</span>
            <strong>Training Tip:</strong>{' '}
            <span className="text-muted-foreground">{tip}</span>
          </p>
        </div>
      </ScrollReveal>
      </div>
    </div>
  )
}
