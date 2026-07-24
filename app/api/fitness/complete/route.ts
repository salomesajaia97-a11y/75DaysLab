import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import { recomputeDailyLog } from '@/lib/recompute-daily-log'
import { resolveLogicalToday } from '@/lib/logical-day-context'

/**
 * Mark a structured or outdoor workout complete/incomplete for today. Sole writer
 * of the raw workout booleans on the DailyLog. The spine derives
 * `workoutCompleted` (= both) + `allComplete` and advances the challenge.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !mongoose.Types.ObjectId.isValid(session.user.id))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, done } = await req.json()
  if (type !== 'structured' && type !== 'outdoor')
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  if (typeof done !== 'boolean')
    return NextResponse.json({ error: 'Invalid done' }, { status: 400 })

  const now = new Date()
  const clock = () => now
  const date = await resolveLogicalToday(session.user.id, clock)
  const override =
    type === 'structured'
      ? { structuredWorkoutCompleted: done }
      : { outdoorWorkoutCompleted: done }

  const { log } = await recomputeDailyLog(session.user.id, date, override, clock)

  return NextResponse.json({
    date: log.date,
    waterCompleted: log.waterCompleted,
    journalCompleted: log.journalCompleted,
    nutritionCompleted: log.nutritionCompleted,
    structuredWorkoutCompleted: log.structuredWorkoutCompleted,
    outdoorWorkoutCompleted: log.outdoorWorkoutCompleted,
    workoutCompleted: log.workoutCompleted,
    photoUploaded: log.photoUploaded,
    allComplete: log.allComplete,
  })
}
