import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { User } from '@/models/User'
import { Challenge } from '@/models/Challenge'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { age, gender, heightCm, weightKg, goal, focusArea, startDate, totalDays } =
    await req.json()

  await connectDB()

  await User.findByIdAndUpdate(session.user.id, {
    age: Number(age),
    gender,
    heightCm: Number(heightCm),
    weightKg: Number(weightKg),
    goal,
    focusArea,
    onboardingComplete: true,
  })

  await Challenge.findOneAndUpdate(
    { userId: session.user.id, isActive: true },
    {
      userId: session.user.id,
      startDate: new Date(startDate),
      totalDays: Number(totalDays) || 75,
      currentDay: 1,
      currentStreak: 0,
      isActive: true,
    },
    { upsert: true, new: true }
  )

  return NextResponse.json({ success: true })
}
