import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { Recipe } from '@/models/Recipe'
import { classifyRecipe } from '@/lib/classify'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.SCRAPER_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const cursor = Recipe.find({}, 'title category tags ingredients').lean().cursor()
  let updated = 0
  for await (const r of cursor) {
    const derived = classifyRecipe(r as Record<string, unknown>)
    await Recipe.updateOne({ _id: r._id }, { $set: derived })
    updated++
  }

  return NextResponse.json({ ok: true, updated })
}
