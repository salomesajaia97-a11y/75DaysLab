import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { WaterLog } from '@/models/WaterLog'
import { recomputeDailyLog } from '@/lib/recompute-daily-log'
import { resolveLogicalToday } from '@/lib/logical-day-context'

/** Guard against absurd single entries (data hygiene / anti-gaming). */
const MAX_WATER_ML = 5000

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const date = req.nextUrl.searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const logs = await WaterLog.find({ userId: session.user.id, date })
  const totalMl = logs.reduce((sum, l) => sum + l.amountMl, 0)

  return NextResponse.json({ totalMl, logs })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !mongoose.Types.ObjectId.isValid(session.user.id))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amountMl } = await req.json()
  if (typeof amountMl !== 'number' || !Number.isFinite(amountMl) || amountMl <= 0 || amountMl > MAX_WATER_ML)
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

  await connectDB()
  // One instant, one canonical logical day (shared with recomputeDailyLog).
  const now = new Date()
  const clock = () => now
  const date = await resolveLogicalToday(session.user.id, clock)
  const log = await WaterLog.create({ userId: session.user.id, date, amountMl })

  // Update the daily completion spine (non-fatal — the water log is already saved).
  try {
    await recomputeDailyLog(session.user.id, date, undefined, clock)
  } catch (err) {
    console.error('[POST /api/water] recomputeDailyLog failed:', err)
  }

  return NextResponse.json(log, { status: 201 })
}
