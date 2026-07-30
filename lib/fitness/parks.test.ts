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
  searchPlaces,
  sortParks,
  unproject,
  type LatLon,
} from './parks'

const VAKE = findPark('vake-park')!
const RIKE = findPark('rike-park')!
const LISI = findPark('lisi-lake')!

describe('the curated dataset', () => {
  it('covers every requested spot with unique slugs and a district', () => {
    const slugs = TBILISI_PARKS.map(p => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const required of [
      'vake-park',
      'lisi-lake',
      'turtle-lake',
      'mziuri-park',
      'rike-park',
      'dedaena-park',
      'nine-april-park',
      'vera-park',
      'saburtalo-central-park',
      'kikvidze-park',
      'mushtaidi-park',
      'digomi-forest-park',
      'gldani-park',
      'temka-park',
      'botanical-garden',
    ]) {
      expect(slugs).toContain(required)
    }
    for (const park of TBILISI_PARKS) {
      expect(park.district.length).toBeGreaterThan(0)
      expect(park.districtGe.length).toBeGreaterThan(0)
      expect(park.blurbGe.length).toBeGreaterThan(0)
    }
  })
})

describe('searchPlaces', () => {
  it('ignores queries shorter than two characters', () => {
    expect(searchPlaces('v')).toEqual([])
  })

  it('ranks a prefix match on the neighbourhood first', () => {
    expect(searchPlaces('gldan')[0].name).toBe('Gldani')
    expect(searchPlaces('saburt')[0].name).toBe('Saburtalo')
  })

  it('matches Georgian input', () => {
    expect(searchPlaces('ვაკე')[0].name).toBe('Vake')
    expect(searchPlaces('ისანი')[0].name).toBe('Isani')
  })

  it('ignores case, spacing and hyphens', () => {
    expect(searchPlaces('vazha pshavela')[0].name).toBe('Vazha-Pshavela')
  })

  it('finds parks too, flagged as such', () => {
    const hit = searchPlaces('turtle').find(h => h.isPark)
    expect(hit?.name).toBe('Turtle Lake')
  })

  it('returns coordinates usable for distance', () => {
    const [hit] = searchPlaces('vake')
    expect(haversineKm(hit, findPark('vake-park')!)).toBeLessThan(2)
  })

  it('caps the result count', () => {
    expect(searchPlaces('a', 3).length).toBeLessThanOrEqual(3)
    expect(searchPlaces('park', 3).length).toBeLessThanOrEqual(3)
  })
})

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

  it('recommends the closest spot, not a nicer one further away', () => {
    // Reported case: standing on Vazha-Pshavela, Saburtalo Central Park is
    // 1.2 km away and Mziuri 1.4 km — shade must not outrank that gap.
    const atVazhaPshavela = searchPlaces('vazha pshavela')[0]
    const rec = recommendPark({ badWeather: false, tempC: 30, userLoc: atVazhaPshavela })!
    expect(rec.park.slug).toBe('saburtalo-central-park')

    const nearest = sortParks(TBILISI_PARKS, {
      badWeather: false,
      tempC: 30,
      userLoc: atVazhaPshavela,
    })[0]
    expect(rec.park.slug).toBe(nearest.slug)
  })

  it('never picks a spot more than 50 m further than the nearest', () => {
    for (const place of ['gldani', 'isani', 'didube', 'sololaki', 'varketili']) {
      const loc = searchPlaces(place)[0]
      const rec = recommendPark({ badWeather: false, tempC: 22, userLoc: loc })!
      const nearestKm = Math.min(...TBILISI_PARKS.map(p => haversineKm(loc, p)))
      expect(rec.distanceKm!).toBeLessThanOrEqual(nearestKm + 0.05 + 1e-9)
    }
  })

  it('accepts a short detour to a sheltered spot when it rains', () => {
    // Turtle Lake is the nearest spot to Bagebi but has no shelter.
    const atBagebi = searchPlaces('bagebi')[0]
    const dry = recommendPark({ badWeather: false, tempC: 18, userLoc: atBagebi })!
    expect(dry.park.rainFriendly).toBe(false)

    const wet = recommendPark({ badWeather: true, tempC: 12, userLoc: atBagebi })!
    expect(wet.park.rainFriendly).toBe(true)
    expect(wet.distanceKm!).toBeLessThanOrEqual(dry.distanceKm! + 1 + 1e-9)
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
    // Temka sits across the city on the eastern edge — always last from Lisi.
    expect(sorted.at(-1)!.slug).toBe('temka-park')
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
