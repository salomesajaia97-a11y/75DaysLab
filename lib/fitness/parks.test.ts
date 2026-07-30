import { describe, expect, it } from 'vitest'
import {
  MAP_BOUNDS,
  MAP_VIEW,
  TBILISI_PARKS,
  findPark,
  formatDistance,
  haversineKm,
  isInsideMap,
  project,
  recommendPark,
  sortParks,
  unproject,
  type LatLon,
} from './parks'

const VAKE = findPark('vake-park')!
const RIKE = findPark('rike-park')!
const LISI = findPark('lisi-lake')!

describe('haversineKm', () => {
  it('is zero for the same point', () => {
    expect(haversineKm(VAKE, VAKE)).toBe(0)
  })

  it('matches the real Vake → Rike distance within a few hundred metres', () => {
    // ~5.3 km straight line across town.
    expect(haversineKm(VAKE, RIKE)).toBeGreaterThan(4.9)
    expect(haversineKm(VAKE, RIKE)).toBeLessThan(5.8)
  })
})

describe('formatDistance', () => {
  it('uses metres under a kilometre and one decimal above', () => {
    expect(formatDistance(0.42)).toBe('420 m')
    expect(formatDistance(2.44)).toBe('2.4 km')
    expect(formatDistance(12.4)).toBe('12 km')
  })
})

describe('map projection', () => {
  it('round-trips coordinates through project/unproject', () => {
    for (const park of TBILISI_PARKS) {
      const { x, y } = project(park)
      const back = unproject(x, y)
      expect(back.lat).toBeCloseTo(park.lat, 6)
      expect(back.lon).toBeCloseTo(park.lon, 6)
    }
  })

  it('keeps every curated park inside the drawn frame', () => {
    for (const park of TBILISI_PARKS) {
      expect(isInsideMap(park)).toBe(true)
      const { x, y } = project(park)
      expect(x).toBeGreaterThan(0)
      expect(x).toBeLessThan(MAP_VIEW.w)
      expect(y).toBeGreaterThan(0)
      expect(y).toBeLessThan(MAP_VIEW.h)
    }
  })

  it('rejects points outside the bounding box', () => {
    expect(isInsideMap({ lat: MAP_BOUNDS.latMin - 0.1, lon: 44.8 })).toBe(false)
    expect(isInsideMap({ lat: 41.72, lon: MAP_BOUNDS.lonMax + 0.1 })).toBe(false)
  })
})

describe('recommendPark', () => {
  it('prefers a rain-friendly paved spot when it rains', () => {
    const rec = recommendPark({ badWeather: true, tempC: 12, userLoc: null })!
    expect(rec.park.rainFriendly).toBe(true)
    expect(rec.reason).toBe('rain')
  })

  it('prefers a shaded spot on a hot day', () => {
    const rec = recommendPark({ badWeather: false, tempC: 33, userLoc: null })!
    expect(rec.park.shaded).toBe(true)
    expect(rec.reason).toBe('hot')
  })

  it('picks a nearby spot over a better-but-distant one', () => {
    // Standing at Rike Park: Lisi (great long run) is ~8 km away.
    const atRike: LatLon = { lat: RIKE.lat, lon: RIKE.lon }
    const rec = recommendPark({ badWeather: false, tempC: 20, userLoc: atRike })!
    expect(rec.park.slug).toBe('rike-park')
    expect(rec.reason).toBe('near')
    expect(rec.distanceKm).toBeCloseTo(0, 3)
  })

  it('reports no distance when the location is unknown', () => {
    expect(recommendPark({ badWeather: false, tempC: 20, userLoc: null })!.distanceKm).toBeNull()
  })

  it('returns null for an empty candidate list', () => {
    expect(recommendPark({ badWeather: false, tempC: 20, userLoc: null }, [])).toBeNull()
  })
})

describe('sortParks', () => {
  it('orders by distance once a location is known', () => {
    const atLisi: LatLon = { lat: LISI.lat, lon: LISI.lon }
    const sorted = sortParks(TBILISI_PARKS, { badWeather: false, tempC: 18, userLoc: atLisi })
    expect(sorted[0].slug).toBe('lisi-lake')
    expect(sorted.at(-1)!.slug).toBe('rike-park')
  })

  it('puts rain-friendly spots first with no location on a wet day', () => {
    const sorted = sortParks(TBILISI_PARKS, { badWeather: true, tempC: 9, userLoc: null })
    expect(sorted[0].rainFriendly).toBe(true)
    expect(sorted.at(-1)!.rainFriendly).toBe(false)
  })

  it('never drops or duplicates a park', () => {
    const sorted = sortParks(TBILISI_PARKS, { badWeather: true, tempC: 9, userLoc: LISI })
    expect(new Set(sorted.map(p => p.slug)).size).toBe(TBILISI_PARKS.length)
  })
})
