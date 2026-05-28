export interface CyclePrediction {
  periodDates: Date[]
  ovulationDate: Date
  fertileDates: Date[]
}

export function predictCycle(
  lastPeriodStart: Date,
  cycleLength = 28,
): CyclePrediction {
  const msPerDay = 86400000

  const nextPeriodStart = new Date(lastPeriodStart.getTime() + cycleLength * msPerDay)
  const ovulationDate = new Date(nextPeriodStart.getTime() - 14 * msPerDay)

  const periodDates: Date[] = []
  for (let i = 0; i < 5; i++) {
    periodDates.push(new Date(nextPeriodStart.getTime() + i * msPerDay))
  }

  const fertileDates: Date[] = []
  for (let i = -5; i <= 1; i++) {
    fertileDates.push(new Date(ovulationDate.getTime() + i * msPerDay))
  }

  return { periodDates, ovulationDate, fertileDates }
}
