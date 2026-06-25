import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { User } from '@/models/User'
import { openRouterClient, buildSystemPrompt, parseMacros } from '@/lib/ai'
import type { WeatherContext, ProgressContext } from '@/lib/ai'
import { classifyIntent, parsePantryItems, extractPriceTerm } from '@/lib/ai/intent'
import { matchIngredients } from '@/lib/grocery/match'
import { findWebRecipes } from '@/lib/recipes/find'
import { RETAILER_LABELS } from '@/lib/grocery/types'
import type { MatchedIngredient } from '@/lib/grocery/types'
import type { WebRecipe } from '@/lib/recipes/types'

async function fetchWeather(city: string): Promise<WeatherContext | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey || apiKey === 'placeholder') return null

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`
    const res = await fetch(url, { next: { revalidate: 1800 } })
    if (!res.ok) return null
    const data = await res.json()
    const mainCondition: string = (data.weather?.[0]?.main ?? '').toLowerCase()
    return {
      temp: Math.round(data.main?.temp ?? 0),
      condition: data.weather?.[0]?.description ?? 'unknown',
      precipitation: ['rain', 'drizzle', 'snow', 'thunderstorm'].includes(mainCondition),
    }
  } catch {
    return null
  }
}

async function fetchUsdaContext(query: string): Promise<string | null> {
  const apiKey = process.env.FDC_API_KEY ?? 'DEMO_KEY'
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&api_key=${apiKey}&pageSize=3&dataType=SR%20Legacy,Foundation`

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const data = await res.json()
    const foods: Array<{
      description: string
      foodNutrients: Array<{ nutrientId: number; value: number }>
    }> = data.foods?.slice(0, 3) ?? []
    if (!foods.length) return null

    return foods
      .map(f => {
        const n = f.foodNutrients ?? []
        const get = (id: number) => n.find(x => x.nutrientId === id)?.value?.toFixed(1) ?? '?'
        return `${f.description}: ${get(1008)} kcal, ${get(1003)}g protein, ${get(1005)}g carbs, ${get(1004)}g fat per 100g`
      })
      .join('\n')
  } catch {
    return null
  }
}

function formatGrocery(items: MatchedIngredient[]): string {
  return items.map(it => {
    if (it.matches.length === 0) return `- ${it.term}: not available`
    const lines = it.matches
      .slice().sort((a, b) => a.price - b.price)
      .map(m => `${RETAILER_LABELS[m.retailer]} ₾${m.price.toFixed(2)}${m.unit ? '/' + m.unit : ''}`)
      .join(', ')
    return `- ${it.term}: ${lines}`
  }).join('\n')
}

function formatWebRecipe(r: WebRecipe): string {
  return `Title: ${r.title}\nIngredients:\n${r.ingredients.map(i => '- ' + i).join('\n')}\nSteps:\n${r.instructions.map((s, i) => `${i + 1}. ${s}`).join('\n')}${r.totalTimeMin ? `\nTime: ${r.totalTimeMin} min` : ''}${r.servings ? `\nServes: ${r.servings}` : ''}`
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { message?: string; mode?: string; todayProgress?: ProgressContext }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { message, mode = 'chat', todayProgress } = body

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 })
  }

  await connectDB()
  const user = await User.findById(session.user.id).select(
    'age gender heightCm weightKg goal focusArea city'
  )

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const userContext = {
    age: user.age,
    gender: user.gender,
    heightCm: user.heightCm,
    weightKg: user.weightKg,
    goal: user.goal,
    focusArea: user.focusArea,
  }

  const progress: ProgressContext = todayProgress ?? {
    streak_day: 1,
    water_intake_ml: 0,
    workout_1_completed: false,
    workout_2_completed: false,
    calories_consumed: 0,
    daily_calorie_target: 2000,
  }

  const [weather, usdaContext] = await Promise.all([
    user.city?.trim() ? fetchWeather(user.city.trim()) : Promise.resolve(null),
    mode === 'food_log' ? fetchUsdaContext(message) : Promise.resolve(null),
  ])

  const intent = mode === 'chat' ? classifyIntent(message) : mode

  let groceryContext: string | null = null
  let webRecipeContext: string | null = null
  // When web search finds no real recipe (or CSE keys aren't set), we ask the
  // model to GENERATE a custom recipe instead. `recipeRequest` carries what to
  // generate: the dish text and, for pantry mode, the ingredients on hand.
  let recipeRequest: { dish: string; pantry?: string[] } | null = null

  if (intent === 'grocery_price') {
    const term = extractPriceTerm(message)
    if (term) {
      const items = await matchIngredients([term])
      groceryContext = formatGrocery(items)
    }
  } else if (intent === 'recipe_web') {
    const recipes = await findWebRecipes(message)
    if (recipes[0]) webRecipeContext = formatWebRecipe(recipes[0])
    else recipeRequest = { dish: message }
  } else if (intent === 'cook_from_pantry') {
    const pantry = parsePantryItems(message)
    const recipes = await findWebRecipes(pantry.join(' '))
    if (recipes[0]) {
      webRecipeContext = formatWebRecipe(recipes[0])
      const missing = recipes[0].ingredients.filter(
        ing => !pantry.some(p => ing.toLowerCase().includes(p.toLowerCase())),
      )
      if (missing.length) {
        const items = await matchIngredients(missing)
        groceryContext = formatGrocery(items)
      }
    } else {
      recipeRequest = { dish: pantry.length ? pantry.join(', ') : message, pantry }
    }
  }

  const systemPrompt = buildSystemPrompt(userContext, progress, weather, usdaContext, groceryContext, webRecipeContext, recipeRequest)
  // Recipes need room for a full ingredient list + numbered steps.
  const maxTokens = webRecipeContext || recipeRequest ? 900 : 512

  // NOTE: OpenRouter removed/throttled the `:free` model slugs (404 "unavailable for
  // free" / 429 rate-limited upstream), which made every AI call fail and silently
  // log 0-calorie entries. Use the paid (and very cheap) slug, which is reliable.
  const model = 'meta-llama/llama-3.1-8b-instruct'

  let rawText: string
  try {
    const completion = await openRouterClient.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: maxTokens,
    })
    rawText = completion.choices[0]?.message?.content ?? ''
    if (!rawText) {
      console.error('[LabAI] Empty response from OpenRouter')
      return NextResponse.json({ error: 'LabAI is unavailable, try again.' }, { status: 502 })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[LabAI] OpenRouter error:', msg)
    const isDev = process.env.NODE_ENV !== 'production'
    return NextResponse.json(
      { error: isDev ? `LabAI error: ${msg}` : 'LabAI is unavailable, try again.' },
      { status: 502 }
    )
  }

  const { message: aiMessage, macros } = parseMacros(rawText)

  return NextResponse.json({ message: aiMessage, macros })
}
