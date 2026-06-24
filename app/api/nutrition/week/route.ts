import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { FoodLog } from '@/models/FoodLog'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const dates: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }

  const rows = await FoodLog.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(session.user.id), date: { $in: dates } } },
    { $group: { _id: '$date', calories: { $sum: '$calories' } } },
  ])
  const byDate = new Map<string, number>(rows.map(r => [r._id as string, r.calories as number]))
  const days = dates.map(date => ({ date, calories: byDate.get(date) ?? 0 }))

  return NextResponse.json({ days })
}
