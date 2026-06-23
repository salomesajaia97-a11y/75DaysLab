import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { Recipe } from '@/models/Recipe'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.SCRAPER_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.title || !body?.sourceUrl || !body?.sourceSite) {
    return NextResponse.json({ error: 'Missing: title, sourceUrl, sourceSite' }, { status: 400 })
  }

  await connectDB()

  const existing = await Recipe.findOne({ sourceUrl: body.sourceUrl })
  if (existing) {
    return NextResponse.json({ ok: true, status: 'skipped' })
  }

  await Recipe.create({ ...body, scrapedAt: new Date() })
  return NextResponse.json({ ok: true, status: 'saved' })
}
