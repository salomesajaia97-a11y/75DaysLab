import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { User } from '@/models/User'
import { DailyLog } from '@/models/DailyLog'
import { WaterLog } from '@/models/WaterLog'
import { Challenge } from '@/models/Challenge'
import { recomputeDailyLog } from '@/lib/recompute-daily-log'
import { isValidDayString, isFutureDay, buildChallengeView } from '@/lib/progress'
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

  const today = new Date().toISOString().split('T')[0]
  const requested = req.nextUrl.searchParams.get('date')
  // Reject malformed or future dates before any DB work (no writing the future).
  if (requested !== null && (!isValidDayString(requested) || isFutureDay(requested, today)))
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  const date = requested ?? today

  await connectDB()

  // Lazy self-heal: recompute today's flags from sources and advance the
  // challenge (reset-if-missed / streak). Non-fatal — a failure just serves the
  // last stored values. Only for the live day (past dates are read-only).
  if (date === today) {
    try {
      await recomputeDailyLog(session.user.id, date)
    } catch (err) {
      console.error('[GET /api/daily-progress] self-heal failed:', err)
    }
  }

  const [user, dailyLog, waterLogs, challenge, totalCompletedDays] = await Promise.all([
    User.findById(session.user.id).select('age gender heightCm weightKg goal'),
    DailyLog.findOne({ userId: session.user.id, date }),
    WaterLog.find({ userId: session.user.id, date }),
    Challenge.findOne({ userId: session.user.id, isActive: true }),
    // Historical verified completed days — survives attempt resets (never a
    // calendar-day count). This is the honest "completed days" metric.
    DailyLog.countDocuments({ userId: session.user.id, allComplete: true }),
  ])

  const waterMl = waterLogs.reduce((sum, l) => sum + l.amountMl, 0)
  const calorieTarget = computeCalorieTarget(
    user?.age,
    user?.gender,
    user?.heightCm,
    user?.weightKg,
    user?.goal
  )

  const flags = {
    waterCompleted: dailyLog?.waterCompleted ?? false,
    journalCompleted: dailyLog?.journalCompleted ?? false,
    nutritionCompleted: dailyLog?.nutritionCompleted ?? false,
    structuredWorkoutCompleted: dailyLog?.structuredWorkoutCompleted ?? false,
    outdoorWorkoutCompleted: dailyLog?.outdoorWorkoutCompleted ?? false,
    workoutCompleted: dailyLog?.workoutCompleted ?? false,
    photoUploaded: dailyLog?.photoUploaded ?? false,
    allComplete: dailyLog?.allComplete ?? false,
  }

  return NextResponse.json({
    // --- backward-compatible fields (existing consumers, e.g. LabAIWidget) ---
    workoutCompleted: flags.workoutCompleted,
    waterMl,
    calorieTarget,
    // --- full daily completion flags ---
    flags,
    // Historical verified completed days (survives resets; not calendar days).
    totalCompletedDays,
    // --- active challenge summary (null when none) ---
    challenge: challenge
      ? {
          totalDays: challenge.totalDays,
          currentDay: challenge.currentDay,
          currentStreak: challenge.currentStreak,
          longestStreak: challenge.longestStreak,
          startDate: challenge.startDate,
          lastCompletedDate: challenge.lastCompletedDate ?? null,
        }
      : null,
    // Accurately-labeled, server-owned view for the dashboard (null when none).
    view: challenge
      ? buildChallengeView(
          {
            totalDays: challenge.totalDays,
            currentDay: challenge.currentDay,
            currentStreak: challenge.currentStreak,
            longestStreak: challenge.longestStreak,
          },
          totalCompletedDays
        )
      : null,
  })
}
