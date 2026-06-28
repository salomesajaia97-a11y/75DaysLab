import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { findCity, DEFAULT_CITY_ID } from '@/lib/fitness/cities'

// OpenWeather condition groups that count as "bad" weather for an outdoor walk.
// 2xx thunderstorm · 3xx drizzle · 5xx rain · 6xx snow
function isBadCondition(id: number): boolean {
  return id < 700 && id >= 200
}

export interface WeatherPayload {
  city: string
  tempC: number
  feelsLikeC: number
  condition: string
  description: string
  icon: string
  isBad: boolean
  /** True when the data is demo/fallback, not a live OpenWeather reading. */
  mock?: boolean
}

// A real OpenWeather key is 32 chars; anything shorter (e.g. "placeholder") is not usable.
function hasRealKey(key: string | undefined): key is string {
  return !!key && key.length >= 16
}

// Deterministic demo data so the UI works before a real key is configured.
// Coastal cities lean rainy to exercise the "bad weather" recommendation branch.
function mockWeather(cityId: string): WeatherPayload {
  const rainy = ['Batumi', 'Poti', 'Zugdidi'].includes(cityId)
  return rainy
    ? { city: cityId, tempC: 14, feelsLikeC: 13, condition: 'Rain', description: 'light rain', icon: '10d', isBad: true, mock: true }
    : { city: cityId, tempC: 22, feelsLikeC: 22, condition: 'Clear', description: 'clear sky', icon: '01d', isBad: false, mock: true }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cityId = req.nextUrl.searchParams.get('city') ?? DEFAULT_CITY_ID
  const city = findCity(cityId)
  if (!city) return NextResponse.json({ error: 'Unknown city' }, { status: 400 })

  const key = process.env.OPENWEATHER_API_KEY
  // Without a real key, serve demo data instead of a broken card.
  if (!hasRealKey(key)) return NextResponse.json(mockWeather(city.id))

  const url =
    `https://api.openweathermap.org/data/2.5/weather` +
    `?lat=${city.lat}&lon=${city.lon}&units=metric&appid=${key}`

  let res: Response
  try {
    // Cache upstream for 10 min — weather doesn't change minute-to-minute.
    res = await fetch(url, { next: { revalidate: 600 } })
  } catch (err) {
    console.error('[fitness/weather] fetch', err instanceof Error ? err.message : String(err))
    return NextResponse.json(mockWeather(city.id))
  }

  if (!res.ok) {
    console.error('[fitness/weather] upstream status', res.status)
    return NextResponse.json(mockWeather(city.id))
  }

  const data = await res.json()
  const w = data.weather?.[0] ?? {}
  const payload: WeatherPayload = {
    city: city.id,
    tempC: Math.round(data.main?.temp ?? 0),
    feelsLikeC: Math.round(data.main?.feels_like ?? data.main?.temp ?? 0),
    condition: w.main ?? 'Clear',
    description: w.description ?? '',
    icon: w.icon ?? '01d',
    isBad: isBadCondition(Number(w.id ?? 800)),
  }

  return NextResponse.json(payload)
}
