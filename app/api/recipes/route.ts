import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { Recipe } from '@/models/Recipe'

export async function GET(req: NextRequest) {
  await connectDB()

  const { searchParams } = new URL(req.url)
  const site = searchParams.get('site')
  const category = searchParams.get('category')
  const maxCal = searchParams.get('maxCal')
  const minCal = searchParams.get('minCal')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 200)

  const filter: Record<string, unknown> = {}
  if (site) filter.sourceSite = site
  if (category) filter.category = { $regex: category, $options: 'i' }
  if (maxCal || minCal) {
    filter.calories = {}
    if (maxCal) (filter.calories as Record<string, number>)['$lte'] = parseInt(maxCal)
    if (minCal) (filter.calories as Record<string, number>)['$gte'] = parseInt(minCal)
  }

  const recipes = await Recipe.find(filter)
    .sort({ scrapedAt: -1 })
    .limit(limit)
    .lean()

  return NextResponse.json(
    { recipes, total: recipes.length },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
  )
}
