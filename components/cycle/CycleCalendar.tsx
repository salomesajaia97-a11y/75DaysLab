'use client'
import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface CyclePrediction {
  periodDates: Date[]
  ovulationDate: Date
  fertileDates: Date[]
}

interface CycleCalendarProps {
  predictions: CyclePrediction
}

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
      <div className="flex gap-3 flex-wrap">
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Period (predicted)</Badge>
        <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">Fertile window</Badge>
        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Ovulation</Badge>
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Logged</Badge>
      </div>
      <Calendar
        mode="single"
        selected={selected}
        onSelect={setSelected}
        modifiers={{
          period: predictions.periodDates,
          fertile: predictions.fertileDates,
          ovulation: [predictions.ovulationDate].filter(Boolean),
          logged: loggedDates,
        }}
        modifiersClassNames={{
          period: 'bg-red-500/20 text-red-400 rounded-full',
          fertile: 'bg-pink-500/20 text-pink-400 rounded-full',
          ovulation: 'bg-purple-500/30 text-purple-400 rounded-full ring-1 ring-purple-400',
          logged: 'bg-green-500/30 text-green-400 rounded-full',
        }}
        className="rounded-lg border border-border"
      />
      {selected && (
        <Button onClick={logPeriodStart} variant="outline" className="w-full">
          Log Period Start: {selected.toLocaleDateString()}
        </Button>
      )}
      {loggedDates.length > 0 && (
        <p className="text-xs text-muted-foreground">{loggedDates.length} period date(s) logged this session</p>
      )}
    </div>
  )
}
