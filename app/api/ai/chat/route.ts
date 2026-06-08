import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { User } from '@/models/User'
import { openRouterClient, buildSystemPrompt, parseMacros } from '@/lib/ai'
import type { WeatherContext, ProgressContext } from '@/lib/ai'

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

  const systemPrompt = buildSystemPrompt(userContext, progress, weather, usdaContext)

  let rawText: string
  try {
    const completion = await openRouterClient.chat.completions.create({
      model: 'nvidia/nemotron-3-nano-30b-a3b:free',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: 512,
    })
    rawText = completion.choices[0]?.message?.content ?? ''
    if (!rawText) {
      console.error('[LabAI] Empty response from OpenRouter')
    }
  } catch (err) {
    console.error('[LabAI] OpenRouter error:', err)
    return NextResponse.json(
      { error: 'LabAI is unavailable, try again.' },
      { status: 502 }
    )
  }

  const { message: aiMessage, macros } = parseMacros(rawText)

  return NextResponse.json({ message: aiMessage, macros })
}
