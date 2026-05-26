import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CycleCalendar } from '@/components/cycle/CycleCalendar'

function generateMockPredictions() {
  const today = new Date()
  const nextPeriod = new Date(today)
  nextPeriod.setDate(today.getDate() + 14)

  const ovulation = new Date(nextPeriod)
  ovulation.setDate(nextPeriod.getDate() - 14)

  const periodDates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(nextPeriod)
    d.setDate(nextPeriod.getDate() + i)
    return d
  })

  const fertileDates = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(ovulation)
    d.setDate(ovulation.getDate() - 5 + i)
    return d
  })

  return { periodDates, ovulationDate: ovulation, fertileDates }
}

export default function CyclePage() {
  const predictions = generateMockPredictions()

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Cycle Tracker</h1>
      <Card>
        <CardHeader>
          <CardTitle>Menstrual Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <CycleCalendar predictions={predictions} />
        </CardContent>
      </Card>
    </div>
  )
}
