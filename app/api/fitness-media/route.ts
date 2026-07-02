import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { FitnessMedia } from '@/models/FitnessMedia'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const query: Record<string, unknown> = { isActive: true }
  if (category) query.category = category

  await connectDB()
  const items = await FitnessMedia.find(query)
    .sort({ order: 1, createdAt: -1 })
    .select('title type url category order')
    .lean()

  return NextResponse.json(items)
}
