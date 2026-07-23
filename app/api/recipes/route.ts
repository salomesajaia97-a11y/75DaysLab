import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { Recipe } from '@/models/Recipe'
import { escapeRegex } from '@/lib/security'

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 200

// Explicit field allowlist. The recipe-browser list UI consumes only these
// fields; heavy arrays (ingredients, instructions) and internal Mongoose fields
// (__v) are never sent. `_id` is included by default and used as the card key /
// detail-page link.
const LIST_FIELDS =
  'title sourceUrl sourceSite imageUrl calories protein carbs fat cookTimeMin prepTimeMin totalTimeMin servings description category tags ingredientCount isOnePot dietTags'

/** Parse an optional finite number query param; null when absent or malformed. */
function finiteParam(params: URLSearchParams, key: string): number | null {
  const v = params.get(key)
  if (v === null || v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)

  // Pagination — validated and bounded. Malformed or extreme values are
  // rejected rather than silently coerced.
  let limit = DEFAULT_LIMIT
  const rawLimit = searchParams.get('limit')
  if (rawLimit !== null) {
    const n = Number(rawLimit)
    if (!Number.isInteger(n) || n < 1) {
      return NextResponse.json({ error: 'Invalid limit' }, { status: 400 })
    }
    if (n > MAX_LIMIT) {
      return NextResponse.json({ error: 'Limit too large' }, { status: 400 })
    }
    limit = n
  }

  let page = 1
  const rawPage = searchParams.get('page')
  if (rawPage !== null) {
    const n = Number(rawPage)
    if (!Number.isInteger(n) || n < 1) {
      return NextResponse.json({ error: 'Invalid page' }, { status: 400 })
    }
    page = n
  }

  const filter: Record<string, unknown> = {}

  const site = searchParams.get('site')
  if (site) filter.sourceSite = site

  // User-controlled text — escape before it reaches a MongoDB regex so it
  // matches literally (no regex injection / ReDoS).
  const category = searchParams.get('category')
  if (category) filter.category = { $regex: escapeRegex(category), $options: 'i' }

  const maxCal = finiteParam(searchParams, 'maxCal')
  const minCal = finiteParam(searchParams, 'minCal')
  if (maxCal !== null || minCal !== null) {
    const cal: Record<string, number> = {}
    if (maxCal !== null) cal.$lte = maxCal
    if (minCal !== null) cal.$gte = minCal
    filter.calories = cal
  }

  const maxIngredients = finiteParam(searchParams, 'maxIngredients')
  if (maxIngredients !== null) filter.ingredientCount = { $lte: maxIngredients }

  if (searchParams.get('onePot') === 'true') filter.isOnePot = true

  const diet = searchParams.get('diet')
  if (diet) filter.dietTags = { $in: diet.split(',').map((d) => d.trim()).filter(Boolean) }

  const minProtein = finiteParam(searchParams, 'minProtein')
  if (minProtein !== null) filter.protein = { $gte: minProtein }

  const maxCarbs = finiteParam(searchParams, 'maxCarbs')
  if (maxCarbs !== null) filter.carbs = { $lte: maxCarbs }

  const maxTime = finiteParam(searchParams, 'maxTime')
  if (maxTime !== null) filter.totalTimeMin = { $lte: maxTime }

  await connectDB()

  const recipes = await Recipe.find(filter, LIST_FIELDS)
    .sort({ scrapedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()

  return NextResponse.json(
    { recipes, total: recipes.length },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
  )
}
