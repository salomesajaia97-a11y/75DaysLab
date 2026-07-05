'use client'
import { useCallback, useEffect, useState } from 'react'
import { Cloud, Sun, CloudRain, Snowflake, CloudSun, Wind, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarkComplete } from '@/hooks/useMarkComplete'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLanguage } from '@/lib/i18n'
import { GEORGIAN_CITIES, DEFAULT_CITY_ID, findCity } from '@/lib/fitness/cities'
import { StepTracker } from './StepTracker'
import { TbilisiParks } from './TbilisiParks'
import type { WeatherPayload } from '@/app/api/fitness/weather/route'

const CITY_KEY = '75lab_fitness_city'

type Status = 'loading' | 'success' | 'error'

// Map an OpenWeather "main" condition to an on-brand icon (no external icon load).
function ConditionIcon({ condition, isBad }: { condition: string; isBad: boolean }) {
  const cls = 'h-9 w-9 text-foreground/80'
  const c = condition.toLowerCase()
  if (c.includes('snow')) return <Snowflake className={cls} />
  if (c.includes('rain') || c.includes('drizzle') || c.includes('thunder'))
    return <CloudRain className={cls} />
  if (c.includes('cloud')) return isBad ? <Cloud className={cls} /> : <CloudSun className={cls} />
  if (c.includes('wind') || c.includes('mist') || c.includes('fog'))
    return <Wind className={cls} />
  return <Sun className={cls} />
}

export function OutdoorWorkout() {
  const { t, locale } = useLanguage()
  const [cityId, setCityId] = useState(DEFAULT_CITY_ID)
  const [status, setStatus] = useState<Status>('loading')
  const [weather, setWeather] = useState<WeatherPayload | null>(null)
  const { done, markComplete } = useMarkComplete()

  // Restore last city after mount (hydration-safe localStorage sync).
  useEffect(() => {
    const saved = localStorage.getItem(CITY_KEY)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved && findCity(saved)) setCityId(saved)
  }, [])

  const loadWeather = useCallback(async (id: string) => {
    setStatus('loading')
    try {
      const res = await fetch(`/api/fitness/weather?city=${encodeURIComponent(id)}`)
      if (!res.ok) throw new Error(`weather ${res.status}`)
      setWeather((await res.json()) as WeatherPayload)
      setStatus('success')
    } catch {
      setWeather(null)
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    // Fetch weather when the city changes — network sync, the canonical effect use.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    loadWeather(cityId)
  }, [cityId, loadWeather])

  const onCityChange = (val: string | null) => {
    if (!val) return
    setCityId(val)
    localStorage.setItem(CITY_KEY, val)
  }

  const city = findCity(cityId)
  const isBad = weather?.isBad ?? false
  const showParks = city?.hasParks ?? false

  const labelFor = (id: string) => {
    const c = findCity(id)
    if (!c) return id
    return locale === 'ge' ? c.nameGe : c.name
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">🌤️ {t('fitness.outdoor_title')}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{t('fitness.outdoor_desc')}</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            {t('fitness.city')}
            <Select value={cityId} onValueChange={onCityChange}>
              <SelectTrigger className="h-8 min-w-32">
                <SelectValue>{(val: string | null) => labelFor(val ?? cityId)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {GEORGIAN_CITIES.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {locale === 'ge' ? c.nameGe : c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Weather card */}
        {status === 'loading' && (
          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <span className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {t('fitness.weather_error')}
            </span>
            <Button size="sm" variant="outline" onClick={() => loadWeather(cityId)}>
              {t('fitness.weather_retry')}
            </Button>
          </div>
        )}

        {status === 'success' && weather && (
          <div
            className="rounded-2xl border border-border p-4"
            style={{
              backgroundImage: isBad ? 'var(--gradient-water)' : 'var(--gradient-nutrition)',
            }}
          >
            <div className="flex items-center gap-4">
              <ConditionIcon condition={weather.condition} isBad={isBad} />
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums">{weather.tempC}°</span>
                  <span className="text-sm capitalize text-foreground/70 truncate">
                    {weather.description || weather.condition}
                  </span>
                </div>
                <p className="text-xs text-foreground/60">
                  {labelFor(cityId)} · {t('fitness.feels', { t: weather.feelsLikeC })}
                </p>
              </div>
            </div>

            {/* Smart recommendation */}
            <p className="mt-3 rounded-xl bg-background/70 px-3 py-2 text-sm leading-relaxed text-foreground/90">
              {isBad ? t('fitness.rec_bad') : t('fitness.rec_good')}
            </p>

            {weather.mock && (
              <p className="mt-2 text-[10px] text-foreground/50">{t('fitness.weather_demo')}</p>
            )}
          </div>
        )}

        {/* Step counter */}
        <StepTracker />

        {/* Tbilisi-only parks block */}
        {showParks && <TbilisiParks badWeather={isBad} />}

        {/* Mark outdoor session complete → feeds weekly progress + stats */}
        <Button
          className="w-full"
          variant={done ? 'outline' : 'default'}
          disabled={done}
          onClick={() =>
            markComplete({
              kind: 'outdoor',
              source: 'outdoor',
              title: 'Outdoor Workout',
              exerciseSlugs: [],
              minutes: 45,
            })
          }
        >
          <CheckCircle2 className="h-4 w-4" /> {done ? 'Outdoor session completed' : 'Mark outdoor workout complete'}
        </Button>
      </CardContent>
    </Card>
  )
}
