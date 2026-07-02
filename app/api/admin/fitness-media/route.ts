import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { FitnessMedia, type FitnessMediaCategory } from '@/models/FitnessMedia'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') as FitnessMediaCategory | null
  const items = category
    ? await FitnessMedia.find({ category }).sort({ order: 1, createdAt: -1 })
    : await FitnessMedia.find().sort({ category: 1, order: 1, createdAt: -1 })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, type, url, publicId, category, order } = body

  if (!title || !type || !url || !category)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  await connectDB()
  const item = await FitnessMedia.create({ title, type, url, publicId, category, order: order ?? 0 })
  return NextResponse.json(item, { status: 201 })
}
