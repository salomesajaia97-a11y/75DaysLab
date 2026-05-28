import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { FoodLog } from '@/models/FoodLog'

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
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { description, calories, proteinG, carbsG, fatG } = body
  if (!description) return NextResponse.json({ error: 'Description required' }, { status: 400 })

  await connectDB()
  const date = new Date().toISOString().split('T')[0]
  const log = await FoodLog.create({
    userId: session.user.id,
    date,
    description,
    calories: calories ?? 0,
    proteinG: proteinG ?? 0,
    carbsG: carbsG ?? 0,
    fatG: fatG ?? 0,
  })

  return NextResponse.json(log, { status: 201 })
}
