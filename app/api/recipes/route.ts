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

  const maxIngredients = searchParams.get('maxIngredients')
  if (maxIngredients) filter.ingredientCount = { $lte: parseInt(maxIngredients) }

  if (searchParams.get('onePot') === 'true') filter.isOnePot = true

  const diet = searchParams.get('diet')
  if (diet) filter.dietTags = { $in: diet.split(',').map(d => d.trim()).filter(Boolean) }

  const minProtein = searchParams.get('minProtein')
  if (minProtein) filter.protein = { $gte: parseInt(minProtein) }

  const maxCarbs = searchParams.get('maxCarbs')
  if (maxCarbs) filter.carbs = { $lte: parseInt(maxCarbs) }

  const maxTime = searchParams.get('maxTime')
  if (maxTime) filter.totalTimeMin = { $lte: parseInt(maxTime) }

  const recipes = await Recipe.find(filter)
    .sort({ scrapedAt: -1 })
    .limit(limit)
    .lean()

  return NextResponse.json(
    { recipes, total: recipes.length },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
  )
}
