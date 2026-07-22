import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { User } from '@/models/User'
import { Challenge } from '@/models/Challenge'
import mongoose from 'mongoose'

// Authenticated, per-user response — never cache or prerender it.
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || !mongoose.Types.ObjectId.isValid(session.user.id))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const [user, challenge] = await Promise.all([
    User.findById(session.user.id).select('-passwordHash'),
    Challenge.findOne({ userId: session.user.id, isActive: true }),
  ])

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    id: String(user._id),
    username: user.username,
    age: user.age,
    gender: user.gender,
    heightCm: user.heightCm,
    weightKg: user.weightKg,
    goal: user.goal,
    focusArea: user.focusArea,
    startDate: challenge?.startDate?.toISOString().split('T')[0] ?? new Date().toISOString().split('T')[0],
    totalDays: challenge?.totalDays ?? 75,
  })
}
