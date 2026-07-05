import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { Challenge } from '@/models/Challenge'
import { recomputeDailyLog } from '@/lib/recompute-daily-log'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || !mongoose.Types.ObjectId.isValid(session.user.id))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  // Lazy self-heal on read: recompute today's DailyLog from sources and advance
  // the challenge via the streak engine — hard-resets on a missed day and only
  // increments the streak when today is actually complete. Non-fatal: on failure
  // we still return the last-stored challenge below. Safe when the user has no
  // active challenge (recompute's challenge step is a no-op) and when today's
  // DailyLog is missing (it gets upserted).
  const today = new Date().toISOString().split('T')[0]
  try {
    const { challenge } = await recomputeDailyLog(session.user.id, today)
    if (challenge) return NextResponse.json(challenge)
  } catch (err) {
    console.error('[GET /api/challenge] self-heal failed:', err)
  }

  const challenge = await Challenge.findOne({ userId: session.user.id, isActive: true })
  return NextResponse.json(challenge ?? null)
}
