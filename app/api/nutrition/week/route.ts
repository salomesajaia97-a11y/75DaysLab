import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { FoodLog } from '@/models/FoodLog'
import { resolveLogicalToday } from '@/lib/logical-day-context'
import { addDays } from '@/lib/streak'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  // Anchor the 7-day window on the canonical logical "today" (challenge/user
  // timezone + version) rather than a raw UTC key, then step calendar days with
  // the shared, tested helper. The window is inclusive of today, oldest first.
  const today = await resolveLogicalToday(session.user.id)
  const dates: string[] = []
  for (let i = 6; i >= 0; i--) {
    dates.push(addDays(today, -i))
  }

  const rows = await FoodLog.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(session.user.id), date: { $in: dates } } },
    { $group: { _id: '$date', calories: { $sum: '$calories' } } },
  ])
  const byDate = new Map<string, number>(rows.map(r => [r._id as string, r.calories as number]))
  const days = dates.map(date => ({ date, calories: byDate.get(date) ?? 0 }))

  return NextResponse.json({ days })
}
