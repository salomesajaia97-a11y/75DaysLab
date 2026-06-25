import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { FoodLog } from '@/models/FoodLog'
import { aggregateFavorites } from '@/lib/favorites'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  // Pull recent history (cap rows so this stays cheap), newest first.
  const logs = await FoodLog.find({ userId: session.user.id })
    .sort({ loggedAt: -1 })
    .limit(200)
    .lean()

  const favorites = aggregateFavorites(
    logs.map(l => ({
      description: l.description,
      calories: l.calories,
      proteinG: l.proteinG,
      carbsG: l.carbsG,
      fatG: l.fatG,
      loggedAt: l.loggedAt,
    })),
  )

  return NextResponse.json({ favorites })
}
