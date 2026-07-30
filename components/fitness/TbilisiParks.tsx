'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  Crosshair,
  LocateFixed,
  MapPin,
  Navigation,
  Sparkles,
  Trees,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/i18n'
import { scopedKey } from '@/lib/storage'
import {
  TBILISI_PARKS,
  findPark,
  formatDistance,
  haversineKm,
  isInsideMap,
  recommendParks,
  sortParks,
  type LatLon,
  type ParkActivity,
  type PlaceHit,
  type TbilisiPark,
} from '@/lib/fitness/parks'
import { LocationSearch } from './LocationSearch'
import { ParkMap } from './ParkMap'
import { WalkTimer } from './WalkTimer'

const LOC_KEY = '75lab_fitness_user_loc'

/** How many cards show before "show all" — keeps the section compact. */
const COLLAPSED_COUNT = 6

type LocSource = 'gps' | 'map' | 'search'
type GeoState = 'idle' | 'locating' | 'denied' | 'unavailable'

interface StoredLoc extends LatLon {
  source: LocSource
  /** Place name for search hits, so the badge can name where you are. */
  label?: string
  labelGe?: string
}

function activityLabel(a: ParkActivity, t: (k: string) => string): string {
  if (a === 'walk') return t('fitness.park_walk')
  if (a === 'run') return t('fitness.park_run')
  return t('fitness.park_both')
}

function readLoc(): StoredLoc | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(scopedKey(LOC_KEY))
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as StoredLoc
    return typeof v?.lat === 'number' && typeof v?.lon === 'number' ? v : null
  } catch {
    return null
  }
}

interface TbilisiParksProps {
  /** When the weather is bad we surface rain-friendly (paved/sheltered) spots first. */
  badWeather: boolean
  /** Current temperature, when the weather card has it — sharpens the pick. */
  tempC: number | null
  /** Fires when a tracked walk is finished, so the parent logs the outdoor slot. */
  onWalkFinished: (park: TbilisiPark, minutes: number) => void
  /** Today's outdoor slot already logged — the timer stops offering to log again. */
  outdoorDone: boolean
}

/**
 * Tbilisi-only walking/running spots: stylised map, location detection,
 * distance-aware ordering, a weather + location recommendation, and a walk
 * timer bound to the chosen spot. The parent decides whether to render this
 * at all (city === Tbilisi).
 */
export function TbilisiParks({
  badWeather,
  tempC,
  onWalkFinished,
  outdoorDone,
}: TbilisiParksProps) {
  const { t, locale } = useLanguage()
  const [loc, setLoc] = useState<StoredLoc | null>(null)
  const [geo, setGeo] = useState<GeoState>('idle')
  const [pickMode, setPickMode] = useState(false)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  // Restore the last known location after mount (hydration-safe).
  useEffect(() => {
    const saved = readLoc()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setLoc(saved)
  }, [])

  const persist = useCallback((next: StoredLoc | null) => {
    setLoc(next)
    if (next) localStorage.setItem(scopedKey(LOC_KEY), JSON.stringify(next))
    else localStorage.removeItem(scopedKey(LOC_KEY))
  }, [])

  const useMyLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeo('unavailable')
      return
    }
    setGeo('locating')
    setPickMode(false)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGeo('idle')
        persist({ lat: pos.coords.latitude, lon: pos.coords.longitude, source: 'gps' })
      },
      () => setGeo('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    )
  }, [persist])

  const pickOnMap = useCallback(
    (picked: LatLon) => {
      persist({ ...picked, source: 'map' })
      setPickMode(false)
      setGeo('idle')
    },
    [persist],
  )

  const pickFromSearch = useCallback(
    (hit: PlaceHit) => {
      persist({
        lat: hit.lat,
        lon: hit.lon,
        source: 'search',
        label: hit.name,
        labelGe: hit.nameGe,
      })
      setPickMode(false)
      setGeo('idle')
    },
    [persist],
  )

  const userLoc: LatLon | null = loc ? { lat: loc.lat, lon: loc.lon } : null
  const recInput = useMemo(
    () => ({ badWeather, tempC, userLoc: userLoc }),
    // userLoc is derived from loc; comparing the primitive parts keeps this stable.
    [badWeather, tempC, loc?.lat, loc?.lon], // eslint-disable-line react-hooks/exhaustive-deps
  )

  // A shortlist, not a single answer — the top pick plus the next closest.
  const recommendations = useMemo(() => recommendParks(recInput, TBILISI_PARKS, 3), [recInput])
  const recommendation = recommendations[0] ?? null
  const alternates = recommendations.slice(1)
  const parks = useMemo(() => sortParks(TBILISI_PARKS, recInput), [recInput])

  // Collapsed by default so fifteen spots don't push the page over — the
  // recommended and chosen spots are always in view regardless of ordering.
  const visibleParks = useMemo(() => {
    if (showAll) return parks
    const head = parks.slice(0, COLLAPSED_COUNT)
    const pinned = parks.filter(
      p =>
        (p.slug === selectedSlug || p.slug === recommendation?.park.slug) &&
        !head.includes(p),
    )
    return [...head, ...pinned]
  }, [parks, showAll, selectedSlug, recommendation?.park.slug])

  const selected = selectedSlug ? findPark(selectedSlug) : undefined
  /** The timer's spot: the explicit pick, else today's recommendation. */
  const timerPark = selected ?? recommendation?.park
  const offMap = userLoc !== null && !isInsideMap(userLoc)

  const distanceFor = (park: TbilisiPark): string | null =>
    userLoc ? formatDistance(haversineKm(userLoc, park)) : null

  // The recommendation sentence: weather-driven reason + optional distance.
  const recText = (): string => {
    if (!recommendation) return ''
    const park = locale === 'ge' ? recommendation.park.nameGe : recommendation.park.name
    const base = t(`fitness.rec_park_${recommendation.reason}`, {
      park,
      temp: tempC ?? 0,
    })
    if (recommendation.distanceKm === null) return base
    return `${base} ${t('fitness.rec_park_dist', {
      dist: formatDistance(recommendation.distanceKm),
    })}`
  }

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="mb-1 flex items-center gap-2">
        <Trees className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{t('fitness.parks_title')}</h3>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        {badWeather ? t('fitness.parks_bad_note') : t('fitness.parks_good_note')}
      </p>

      {/* Type where you are — resolves against the local Tbilisi gazetteer */}
      <div className="mb-2">
        <LocationSearch onPick={pickFromSearch} />
      </div>

      {/* Location controls */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <Button
          size="xs"
          variant="secondary"
          onClick={useMyLocation}
          disabled={geo === 'locating'}
        >
          <LocateFixed className="h-3 w-3" />
          {geo === 'locating' ? t('fitness.loc_locating') : t('fitness.loc_use_gps')}
        </Button>
        <Button
          size="xs"
          variant={pickMode ? 'default' : 'outline'}
          onClick={() => setPickMode(p => !p)}
          aria-pressed={pickMode}
        >
          <Crosshair className="h-3 w-3" />
          {pickMode ? t('fitness.loc_pick_cancel') : t('fitness.loc_pick_map')}
        </Button>
        {loc && (
          <>
            <Badge variant="outline" className="text-[10px]">
              {loc.source === 'gps'
                ? t('fitness.loc_from_gps')
                : loc.source === 'search'
                  ? ((locale === 'ge' ? loc.labelGe : loc.label) ?? t('fitness.loc_from_search'))
                  : t('fitness.loc_from_map')}
            </Badge>
            <Button size="xs" variant="ghost" onClick={() => persist(null)}>
              <X className="h-3 w-3" />
              {t('fitness.loc_clear')}
            </Button>
          </>
        )}
      </div>

      {(geo === 'denied' || geo === 'unavailable' || offMap || !loc) && (
        <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground" aria-live="polite">
          {geo === 'denied'
            ? t('fitness.loc_denied')
            : geo === 'unavailable'
              ? t('fitness.loc_unavailable')
              : offMap
                ? t('fitness.loc_outside')
                : t('fitness.loc_prompt')}
        </p>
      )}

      <ParkMap
        parks={TBILISI_PARKS}
        selectedSlug={selectedSlug}
        recommendedSlug={recommendation?.park.slug ?? null}
        alternateSlugs={alternates.map(a => a.park.slug)}
        userLoc={offMap ? null : userLoc}
        pickMode={pickMode}
        onPickLocation={pickOnMap}
        onSelectPark={setSelectedSlug}
      />

      {/* Weather + location recommendation */}
      {recommendation && (
        <div
          className="mt-3 rounded-2xl border border-border p-3"
          style={{ backgroundImage: 'var(--gradient-streak)' }}
        >
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" />
            <div className="min-w-0">
              <p className="text-sm leading-relaxed text-foreground/90">{recText()}</p>
              {selectedSlug !== recommendation.park.slug && (
                <Button
                  size="xs"
                  className="mt-2"
                  onClick={() => setSelectedSlug(recommendation.park.slug)}
                >
                  <Navigation className="h-3 w-3" />
                  {t('fitness.rec_park_choose')}
                </Button>
              )}

              {alternates.length > 0 && (
                <div className="mt-2.5 border-t border-foreground/10 pt-2">
                  <p className="text-[11px] font-medium text-foreground/60">
                    {t('fitness.rec_park_alts')}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {alternates.map(alt => (
                      <button
                        key={alt.park.slug}
                        type="button"
                        onClick={() => setSelectedSlug(alt.park.slug)}
                        aria-pressed={selectedSlug === alt.park.slug}
                        className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                          selectedSlug === alt.park.slug
                            ? 'border-foreground/40 bg-background font-medium'
                            : 'border-foreground/15 bg-background/70 hover:bg-background'
                        }`}
                      >
                        {locale === 'ge' ? alt.park.nameGe : alt.park.name}
                        {alt.distanceKm !== null && (
                          <span className="ml-1 text-foreground/50">
                            {formatDistance(alt.distanceKm)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {visibleParks.map(park => {
          const isRec = park.slug === recommendation?.park.slug
          const isAlt = alternates.some(a => a.park.slug === park.slug)
          const isSel = park.slug === selectedSlug
          const dist = distanceFor(park)
          return (
            <li key={park.slug}>
              <button
                type="button"
                onClick={() => setSelectedSlug(park.slug)}
                aria-pressed={isSel}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  isSel
                    ? 'border-primary bg-primary/5'
                    : isRec
                      ? 'border-primary/40 bg-background ring-1 ring-primary/30'
                      : 'border-border bg-background hover:bg-accent/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {locale === 'ge' ? park.nameGe : park.name}
                  </span>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {activityLabel(park.activity, t)}
                  </Badge>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {isRec && (
                    <Badge className="text-[10px]">
                      <Sparkles className="h-2.5 w-2.5" />
                      {t('fitness.rec_park_badge')}
                    </Badge>
                  )}
                  {isAlt && !isSel && (
                    <Badge variant="secondary" className="text-[10px]">
                      {t('fitness.rec_park_alt_badge')}
                    </Badge>
                  )}
                  {isSel && (
                    <Badge variant="secondary" className="text-[10px]">
                      {t('fitness.park_selected')}
                    </Badge>
                  )}
                  {dist && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Navigation className="h-2.5 w-2.5" />
                      {t('fitness.park_distance_away', { dist })}
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {t('fitness.park_loop', { km: park.loopKm })}
                  </span>
                </div>

                <p className="mt-1 text-[11px] text-muted-foreground/80">
                  {locale === 'ge' ? park.districtGe : park.district}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {locale === 'ge' ? park.blurbGe : park.blurb}
                </p>
              </button>
            </li>
          )
        })}
      </ul>

      {parks.length > COLLAPSED_COUNT && (
        <Button
          size="xs"
          variant="ghost"
          className="mt-2 w-full"
          onClick={() => setShowAll(v => !v)}
          aria-expanded={showAll}
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${showAll ? 'rotate-180' : ''}`} />
          {showAll
            ? t('fitness.parks_show_less')
            : t('fitness.parks_show_all', { n: parks.length })}
        </Button>
      )}

      {/* Always available below the list — defaults to the recommended spot
          until the user picks another, and starting the clock pins the choice. */}
      {timerPark && (
        <div className="mt-3">
          <WalkTimer
            park={timerPark}
            onFinish={onWalkFinished}
            onStart={p => setSelectedSlug(p.slug)}
            alreadyLogged={outdoorDone}
          />
        </div>
      )}
    </div>
  )
}
