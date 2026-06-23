import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { Recipe } from '@/models/Recipe'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await connectDB()
  try {
    const recipe = await Recipe.findById(id).lean()
    if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ recipe })
  } catch {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
}
