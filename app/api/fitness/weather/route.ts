import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { findCity, DEFAULT_CITY_ID, type GeorgianCity } from '@/lib/fitness/cities'

export interface WeatherPayload {
  city: string
  tempC: number
  feelsLikeC: number
  condition: string
  description: string
  icon: string
  isBad: boolean
  /** True when the data is demo/fallback, not a live reading. */
  mock?: boolean
}

// OpenWeather condition groups that count as "bad" weather for an outdoor walk.
// 2xx thunderstorm · 3xx drizzle · 5xx rain · 6xx snow
function isBadOwm(id: number): boolean {
  return id < 700 && id >= 200
}

// WMO weather codes (Open-Meteo) → on-brand condition/description.
// `condition` must contain a keyword the UI's ConditionIcon matches
// (snow/rain/drizzle/thunder/cloud/fog/clear). isBad = any precipitation.
function fromWmo(code: number): { condition: string; description: string; isBad: boolean } {
  const m: Record<number, [string, string, boolean]> = {
    0: ['Clear', 'clear sky', false],
    1: ['Clear', 'mainly clear', false],
    2: ['Clouds', 'partly cloudy', false],
    3: ['Clouds', 'overcast', false],
    45: ['Fog', 'fog', false],
    48: ['Fog', 'depositing rime fog', false],
    51: ['Drizzle', 'light drizzle', true],
    53: ['Drizzle', 'moderate drizzle', true],
    55: ['Drizzle', 'dense drizzle', true],
    56: ['Drizzle', 'freezing drizzle', true],
    57: ['Drizzle', 'dense freezing drizzle', true],
    61: ['Rain', 'slight rain', true],
    63: ['Rain', 'moderate rain', true],
    65: ['Rain', 'heavy rain', true],
    66: ['Rain', 'freezing rain', true],
    67: ['Rain', 'heavy freezing rain', true],
    71: ['Snow', 'slight snow', true],
    73: ['Snow', 'moderate snow', true],
    75: ['Snow', 'heavy snow', true],
    77: ['Snow', 'snow grains', true],
    80: ['Rain', 'slight rain showers', true],
    81: ['Rain', 'moderate rain showers', true],
    82: ['Rain', 'violent rain showers', true],
    85: ['Snow', 'slight snow showers', true],
    86: ['Snow', 'heavy snow showers', true],
    95: ['Thunderstorm', 'thunderstorm', true],
    96: ['Thunderstorm', 'thunderstorm with hail', true],
    99: ['Thunderstorm', 'thunderstorm with heavy hail', true],
  }
  const [condition, description, isBad] = m[code] ?? ['Clear', 'clear sky', false]
  return { condition, description, isBad }
}

// A real OpenWeather key is 32 chars; anything shorter (e.g. "placeholder") is not usable.
function hasRealKey(key: string | undefined): key is string {
  return !!key && key.length >= 16
}

// Deterministic demo data so the UI works even if every upstream call fails.
function mockWeather(cityId: string): WeatherPayload {
  const rainy = ['Batumi', 'Poti', 'Zugdidi'].includes(cityId)
  return rainy
    ? { city: cityId, tempC: 14, feelsLikeC: 13, condition: 'Rain', description: 'light rain', icon: '10d', isBad: true, mock: true }
    : { city: cityId, tempC: 22, feelsLikeC: 22, condition: 'Clear', description: 'clear sky', icon: '01d', isBad: false, mock: true }
}

// Open-Meteo: free, keyless, real per-city weather. Default source.
async function fetchOpenMeteo(city: GeorgianCity): Promise<WeatherPayload> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${city.lat}&longitude=${city.lon}` +
    `&current=temperature_2m,apparent_temperature,weather_code`

  // Cache upstream for 10 min — weather doesn't change minute-to-minute.
  const res = await fetch(url, { next: { revalidate: 600 } })
  if (!res.ok) throw new Error(`open-meteo ${res.status}`)

  const data = await res.json()
  const cur = data.current ?? {}
  const { condition, description, isBad } = fromWmo(Number(cur.weather_code ?? 0))
  return {
    city: city.id,
    tempC: Math.round(cur.temperature_2m ?? 0),
    feelsLikeC: Math.round(cur.apparent_temperature ?? cur.temperature_2m ?? 0),
    condition,
    description,
    icon: '01d',
    isBad,
  }
}

// OpenWeather: used only if a real key is configured (legacy/optional path).
async function fetchOpenWeather(city: GeorgianCity, key: string): Promise<WeatherPayload> {
  const url =
    `https://api.openweathermap.org/data/2.5/weather` +
    `?lat=${city.lat}&lon=${city.lon}&units=metric&appid=${key}`

  const res = await fetch(url, { next: { revalidate: 600 } })
  if (!res.ok) throw new Error(`openweather ${res.status}`)

  const data = await res.json()
  const w = data.weather?.[0] ?? {}
  return {
    city: city.id,
    tempC: Math.round(data.main?.temp ?? 0),
    feelsLikeC: Math.round(data.main?.feels_like ?? data.main?.temp ?? 0),
    condition: w.main ?? 'Clear',
    description: w.description ?? '',
    icon: w.icon ?? '01d',
    isBad: isBadOwm(Number(w.id ?? 800)),
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cityId = req.nextUrl.searchParams.get('city') ?? DEFAULT_CITY_ID
  const city = findCity(cityId)
  if (!city) return NextResponse.json({ error: 'Unknown city' }, { status: 400 })

  const key = process.env.OPENWEATHER_API_KEY

  try {
    // Prefer OpenWeather when a real key exists; otherwise use keyless Open-Meteo.
    const payload = hasRealKey(key)
      ? await fetchOpenWeather(city, key)
      : await fetchOpenMeteo(city)
    return NextResponse.json(payload)
  } catch (err) {
    console.error('[fitness/weather]', err instanceof Error ? err.message : String(err))
    // Last resort so the card never breaks.
    return NextResponse.json(mockWeather(city.id))
  }
}
