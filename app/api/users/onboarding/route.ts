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

  // `.catch(() => null)` absorbs a CastError when the session carries an id that
  // isn't a valid Mongo ObjectId (e.g. a stale cookie from a deleted user).
  const user = await User.findByIdAndUpdate(
    session.user.id,
    { age: Number(age), gender, heightCm: Number(heightCm), weightKg: Number(weightKg), goal, focusArea, onboardingComplete: true },
    { new: true }
  ).catch(() => null)

  // Authenticated but no matching user record → stale/orphaned session, not a
  // server fault. Return a clear 404 instead of crashing on `user!._id`.
  if (!user) {
    return NextResponse.json({ error: 'User not found. Please sign in again.' }, { status: 404 })
  }

  const challenge = await Challenge.findOneAndUpdate(
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

  return NextResponse.json({
    success: true,
    profile: {
      id: String(user._id),
      username: user.username,
      age: user.age,
      gender: user.gender,
      heightCm: user.heightCm,
      weightKg: user.weightKg,
      goal: user.goal,
      focusArea: user.focusArea,
      startDate: challenge.startDate.toISOString().split('T')[0],
      totalDays: challenge.totalDays,
    },
  })
}
