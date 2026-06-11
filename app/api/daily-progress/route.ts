import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { User } from '@/models/User'
import { DailyLog } from '@/models/DailyLog'
import { WaterLog } from '@/models/WaterLog'
import mongoose from 'mongoose'

function computeCalorieTarget(
  age?: number,
  gender?: string,
  heightCm?: number,
  weightKg?: number,
  goal?: string
): number {
  if (!age || !heightCm || !weightKg) return 2000

  const bmr =
    gender === 'female'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
      : 10 * weightKg + 6.25 * heightCm - 5 * age + 5

  const tdee = Math.round(bmr * 1.375)

  if (goal === 'lose') return tdee - 500
  if (goal === 'gain') return tdee + 500
  return tdee
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !mongoose.Types.ObjectId.isValid(session.user.id))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const date = req.nextUrl.searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  const [user, dailyLog, waterLogs] = await Promise.all([
    User.findById(session.user.id).select('age gender heightCm weightKg goal'),
    DailyLog.findOne({ userId: session.user.id, date }),
    WaterLog.find({ userId: session.user.id, date }),
  ])

  const waterMl = waterLogs.reduce((sum, l) => sum + l.amountMl, 0)
  const calorieTarget = computeCalorieTarget(
    user?.age,
    user?.gender,
    user?.heightCm,
    user?.weightKg,
    user?.goal
  )

  return NextResponse.json({
    workoutCompleted: dailyLog?.workoutCompleted ?? false,
    waterMl,
    calorieTarget,
  })
}
