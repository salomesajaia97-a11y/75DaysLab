import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { FoodLog } from '@/models/FoodLog'
import { mealFromTime, type MealType } from '@/lib/nutrition-meal'
import { recomputeDailyLog } from '@/lib/recompute-daily-log'

/** Coerce an optional macro/calorie field to a safe non-negative number. */
function nonNegNum(v: unknown): number | null {
  if (v === undefined || v === null) return 0
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return null
  return v
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const date = req.nextUrl.searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const logs = await FoodLog.find({ userId: session.user.id, date }).sort({ loggedAt: 1 })

  const totals = logs.reduce(
    (acc, l) => ({
      calories: acc.calories + (l.calories ?? 0),
      proteinG: acc.proteinG + (l.proteinG ?? 0),
      carbsG: acc.carbsG + (l.carbsG ?? 0),
      fatG: acc.fatG + (l.fatG ?? 0),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  )

  return NextResponse.json({ logs, totals })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !mongoose.Types.ObjectId.isValid(session.user.id))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { description, calories, proteinG, carbsG, fatG, meal, photoUrl } = body
  if (typeof description !== 'string' || !description.trim())
    return NextResponse.json({ error: 'Description required' }, { status: 400 })

  const macros = {
    calories: nonNegNum(calories),
    proteinG: nonNegNum(proteinG),
    carbsG: nonNegNum(carbsG),
    fatG: nonNegNum(fatG),
  }
  if (Object.values(macros).some(v => v === null))
    return NextResponse.json({ error: 'Macros must be non-negative numbers' }, { status: 400 })
  if (photoUrl !== undefined && typeof photoUrl !== 'string')
    return NextResponse.json({ error: 'Invalid photoUrl' }, { status: 400 })

  await connectDB()
  const now = new Date()
  const date = now.toISOString().split('T')[0]
  const validMeals: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
  const resolvedMeal: MealType = validMeals.includes(meal) ? meal : mealFromTime(now)

  const log = await FoodLog.create({
    userId: session.user.id,
    date,
    description: description.trim(),
    calories: macros.calories,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
    meal: resolvedMeal,
    photoUrl: photoUrl || undefined,
  })

  // Update the daily completion spine (non-fatal — the food log is already saved).
  try {
    await recomputeDailyLog(session.user.id, date)
  } catch (err) {
    console.error('[POST /api/nutrition] recomputeDailyLog failed:', err)
  }

  return NextResponse.json(log, { status: 201 })
}
