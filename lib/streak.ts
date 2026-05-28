import type { IDailyLog } from '@/models/DailyLog'

export function isDayComplete(log: IDailyLog): boolean {
  return (
    log.waterCompleted &&
    log.journalCompleted &&
    log.nutritionCompleted &&
    log.workoutCompleted &&
    log.photoUploaded
  )
}

export function evaluateStreak(logs: IDailyLog[]): number {
  const sorted = [...logs].sort((a, b) => (a.date > b.date ? -1 : 1))
  let streak = 0
  for (const log of sorted) {
    if (isDayComplete(log)) streak++
    else break
  }
  return streak
}
