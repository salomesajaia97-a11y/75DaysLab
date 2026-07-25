import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { DailyLog } from '@/models/DailyLog'
import { resolveLogicalToday } from '@/lib/logical-day-context'
import { addDays } from '@/lib/streak'
import { summarizeDay, type DaySummary } from '@/lib/day-status'

/** How many trailing days the history returns (including today). */
const DEFAULT_WINDOW = 7
const MAX_WINDOW = 31

/** Stored task shape needed to classify a day (workout already rolled up). */
interface StoredTasks {
  date: string
  waterCompleted?: boolean
  journalCompleted?: boolean
  nutritionCompleted?: boolean
  workoutCompleted?: boolean
  photoUploaded?: boolean
}

/**
 * Read-only recent history: the last N days (default 7, including today) as
 * derived DaySummary rows, newest first. PURE READ — never recomputes or writes
 * a DailyLog, so past records are never mutated. Days with no record are
 * returned with `hasRecord: false` (→ "No activity"). Status/percentage come
 * from the shared day-status/computeDayResult helpers (no threshold logic here).
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !mongoose.Types.ObjectId.isValid(session.user.id))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const daysParam = req.nextUrl.searchParams.get('days')
  const rawDays = daysParam === null ? NaN : Number(daysParam)
  const window = Number.isFinite(rawDays)
    ? Math.min(Math.max(Math.trunc(rawDays), 1), MAX_WINDOW)
    : DEFAULT_WINDOW

  const now = new Date()
  const clock = () => now
  const today = await resolveLogicalToday(session.user.id, clock)

  // Build the trailing date window (today, today-1, … today-(window-1)).
  const dates = Array.from({ length: window }, (_, i) => addDays(today, -i))

  const logs = await DailyLog.find({ userId: session.user.id, date: { $in: dates } })
    .select('date waterCompleted journalCompleted nutritionCompleted workoutCompleted photoUploaded')
    .lean<StoredTasks[]>()

  const byDate = new Map(logs.map((l) => [l.date, l]))

  const history: DaySummary[] = dates.map((date) => {
    const log = byDate.get(date)
    return summarizeDay(
      date,
      log
        ? {
            waterCompleted: Boolean(log.waterCompleted),
            journalCompleted: Boolean(log.journalCompleted),
            nutritionCompleted: Boolean(log.nutritionCompleted),
            workoutCompleted: Boolean(log.workoutCompleted),
            photoUploaded: Boolean(log.photoUploaded),
          }
        : null
    )
  })

  return NextResponse.json({ today, history })
}
