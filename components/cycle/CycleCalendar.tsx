'use client'
import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'

interface CyclePrediction {
  periodDates: Date[]
  ovulationDate: Date
  fertileDates: Date[]
}

interface CycleCalendarProps {
  predictions: CyclePrediction
}

const PHASES = [
  { label: 'Period (predicted)', bg: '#fbeef1', color: '#c4637a' },
  { label: 'Fertile window',     bg: '#e3f2fd', color: '#3a84b0' },
  { label: 'Ovulation',         bg: '#f3eaff', color: '#7c4fc9' },
  { label: 'Logged',            bg: '#e8f5e9', color: '#2e8a5e' },
]

export function CycleCalendar({ predictions }: CycleCalendarProps) {
  const [selected, setSelected] = useState<Date | undefined>()
  const [loggedDates, setLoggedDates] = useState<Date[]>([])

  function logPeriodStart() {
    if (!selected) return
    setLoggedDates(prev => [...prev, selected])
    setSelected(undefined)
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold mb-3">Menstrual Calendar</p>
        <div className="flex gap-2 flex-wrap">
          {PHASES.map(({ label, bg, color }) => (
            <span
              key={label}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: bg, color }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <Calendar
        mode="single"
        selected={selected}
        onSelect={setSelected}
        modifiers={{
          period:    predictions.periodDates,
          fertile:   predictions.fertileDates,
          ovulation: [predictions.ovulationDate].filter(Boolean),
          logged:    loggedDates,
        }}
        modifiersClassNames={{
          period:    '!bg-[#fbeef1] !text-[#c4637a] rounded-[var(--radius-md)]',
          fertile:   '!bg-[#e3f2fd] !text-[#3a84b0] rounded-[var(--radius-md)]',
          ovulation: '!bg-[#f3eaff] !text-[#7c4fc9] rounded-[var(--radius-md)]',
          logged:    '!bg-[#e8f5e9] !text-[#2e8a5e] rounded-[var(--radius-md)]',
        }}
        classNames={{
          today: '!bg-primary rounded-[var(--radius-md)] [&_button]:!text-primary-foreground',
          outside: '!bg-transparent [&_button]:!bg-transparent [&_button]:!text-muted-foreground [&_button]:opacity-30 pointer-events-none',
        }}
        className="w-full"
      />

      {selected && (
        <Button onClick={logPeriodStart} variant="outline" className="w-full text-sm">
          Log Period Start: {selected.toLocaleDateString()}
        </Button>
      )}
    </div>
  )
}
