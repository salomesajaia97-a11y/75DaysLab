// Curated Tbilisi walking/running destinations.
// Bilingual content lives here (proper nouns + blurbs) so the component
// only needs i18n keys for generic labels.
//
// Coordinates are approximate park centroids — accurate enough for a
// "how far is this from me" hint, not for turn-by-turn navigation.

export type ParkActivity = 'walk' | 'run' | 'both'

export interface TbilisiPark {
  /** Stable id used for selection + the active walk session. */
  slug: string
  name: string
  nameGe: string
  blurb: string
  blurbGe: string
  /** Short label used on the map, where full names would collide. */
  mapLabel: string
  mapLabelGe: string
  /** Manual map-label nudge (viewBox units) for spots that sit close together. */
  labelDx?: number
  labelDy?: number
  labelAnchor?: 'start' | 'middle' | 'end'
  activity: ParkActivity
  /** True when the route stays mostly paved/sheltered — surfaced on rainy days. */
  rainFriendly: boolean
  lat: number
  lon: number
  /** Tree cover — the deciding factor on hot days. */
  shaded: boolean
  /** Lit after dark — small bonus, matters for evening sessions. */
  lit: boolean
  /** Approximate length of the main loop/trail in km. */
  loopKm: number
  /** Lakeside spots read cooler in summer and get their own map shape. */
  water?: boolean
}

export const TBILISI_PARKS: TbilisiPark[] = [
  {
    slug: 'vake-park',
    name: 'Vake Park',
    nameGe: 'ვაკის პარკი',
    blurb: 'Wide shaded avenues and a long stair climb for intervals.',
    blurbGe: 'ფართო ჩრდილიანი ხეივნები და გრძელი კიბე ინტერვალებისთვის.',
    mapLabel: 'Vake',
    mapLabelGe: 'ვაკე',
    activity: 'both',
    rainFriendly: true,
    lat: 41.7089,
    lon: 44.746,
    shaded: true,
    lit: true,
    loopKm: 2.2,
  },
  {
    slug: 'rike-park',
    name: 'Rike Park',
    nameGe: 'რიყის პარკი',
    blurb: 'Flat riverside paved loop by the Mtkvari — easy steady pace.',
    blurbGe: 'ბრტყელი მოასფალტებული მარშრუტი მტკვრის პირას — მშვიდი ტემპი.',
    mapLabel: 'Rike',
    mapLabelGe: 'რიყე',
    activity: 'walk',
    rainFriendly: true,
    lat: 41.6923,
    lon: 44.809,
    shaded: false,
    lit: true,
    loopKm: 1.4,
  },
  {
    slug: 'lisi-lake',
    name: 'Lisi Lake',
    nameGe: 'ლისის ტბა',
    blurb: 'A scenic ~5 km lakeside trail — perfect for a longer run.',
    blurbGe: 'ულამაზესი ~5 კმ ბილიკი ტბის გარშემო — გრძელი სირბილისთვის.',
    mapLabel: 'Lisi Lake',
    mapLabelGe: 'ლისი',
    activity: 'run',
    rainFriendly: false,
    lat: 41.7594,
    lon: 44.7291,
    shaded: false,
    lit: false,
    loopKm: 5,
    water: true,
  },
  {
    slug: 'saburtalo-central-park',
    name: 'Saburtalo Central Park',
    nameGe: 'საბურთალოს ცენტრალური პარკი',
    blurb: 'Compact neighbourhood loops with good lighting and benches.',
    blurbGe: 'კომპაქტური მარშრუტები კარგი განათებითა და სკამებით.',
    mapLabel: 'Saburtalo',
    mapLabelGe: 'საბურთალო',
    activity: 'walk',
    rainFriendly: true,
    lat: 41.736,
    lon: 44.7538,
    shaded: false,
    lit: true,
    loopKm: 1.2,
  },
  {
    slug: 'mziuri-park',
    name: 'Mziuri Park',
    nameGe: 'მზიური',
    blurb: 'Green ravine path along the Vere — sheltered from wind and traffic.',
    blurbGe: 'მწვანე ხეობის ბილიკი ვერეს გაყოლებაზე — დაცული ქარისა და ხმაურისგან.',
    mapLabel: 'Mziuri',
    mapLabelGe: 'მზიური',
    activity: 'both',
    rainFriendly: true,
    lat: 41.7196,
    lon: 44.7638,
    shaded: true,
    lit: true,
    loopKm: 1.8,
  },
  {
    slug: 'turtle-lake',
    name: 'Turtle Lake',
    nameGe: 'კუს ტბა',
    blurb: 'Uphill approach, then a cool lakeside loop with city views.',
    blurbGe: 'აღმართი, შემდეგ გრილი მარშრუტი ტბის გარშემო ქალაქის ხედებით.',
    mapLabel: 'Turtle Lake',
    mapLabelGe: 'კუს ტბა',
    // Sits ~1 km from Vake Park — label goes left of the marker, not under it.
    labelDx: -3,
    labelDy: 1,
    labelAnchor: 'end',
    activity: 'both',
    rainFriendly: false,
    lat: 41.7136,
    lon: 44.7397,
    shaded: true,
    lit: false,
    loopKm: 1.6,
    water: true,
  },
]

export function findPark(slug: string): TbilisiPark | undefined {
  return TBILISI_PARKS.find(p => p.slug === slug)
}

// ── Geo helpers ─────────────────────────────────────────────────────────────

export interface LatLon {
  lat: number
  lon: number
}

const EARTH_R_KM = 6371

/** Great-circle distance in km. */
export function haversineKm(a: LatLon, b: LatLon): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const lat1 = a.lat * rad
  const lat2 = b.lat * rad
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_R_KM * Math.asin(Math.sqrt(h))
}

/** "850 m" under a km, "2.4 km" above — locale-agnostic short form. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 100) * 10} m`
  return `${km.toFixed(km < 10 ? 1 : 0)} km`
}

// ── Map projection ──────────────────────────────────────────────────────────
// Fixed bounding box around the curated spots. Equirectangular projection is
// fine at this scale (~10 km across) and keeps click → coordinate reversible.

export const MAP_BOUNDS = {
  latMin: 41.68,
  latMax: 41.772,
  lonMin: 44.712,
  lonMax: 44.838,
} as const

/** viewBox dimensions chosen so 1 unit of x and y cover the same distance. */
export const MAP_VIEW = { w: 100, h: 98 } as const

export function project({ lat, lon }: LatLon): { x: number; y: number } {
  const { latMin, latMax, lonMin, lonMax } = MAP_BOUNDS
  return {
    x: ((lon - lonMin) / (lonMax - lonMin)) * MAP_VIEW.w,
    y: ((latMax - lat) / (latMax - latMin)) * MAP_VIEW.h,
  }
}

/** Inverse of `project` — turns a map click into coordinates. */
export function unproject(x: number, y: number): LatLon {
  const { latMin, latMax, lonMin, lonMax } = MAP_BOUNDS
  return {
    lon: lonMin + (x / MAP_VIEW.w) * (lonMax - lonMin),
    lat: latMax - (y / MAP_VIEW.h) * (latMax - latMin),
  }
}

export function isInsideMap({ lat, lon }: LatLon): boolean {
  const { latMin, latMax, lonMin, lonMax } = MAP_BOUNDS
  return lat >= latMin && lat <= latMax && lon >= lonMin && lon <= lonMax
}

/** Decorative Mtkvari course, south-east → north-west. */
export const MTKVARI_PATH: LatLon[] = [
  { lat: 41.68, lon: 44.834 },
  { lat: 41.688, lon: 44.82 },
  { lat: 41.694, lon: 44.808 },
  { lat: 41.7, lon: 44.802 },
  { lat: 41.708, lon: 44.797 },
  { lat: 41.716, lon: 44.792 },
  { lat: 41.726, lon: 44.788 },
  { lat: 41.736, lon: 44.786 },
  { lat: 41.746, lon: 44.782 },
  { lat: 41.756, lon: 44.772 },
  { lat: 41.766, lon: 44.762 },
  { lat: 41.772, lon: 44.752 },
]

/** Decorative main-avenue hints so the map reads as a city, not a scatter plot. */
export const MAP_ROADS: LatLon[][] = [
  [
    { lat: 41.697, lon: 44.8 },
    { lat: 41.703, lon: 44.79 },
    { lat: 41.707, lon: 44.775 },
    { lat: 41.709, lon: 44.76 },
    { lat: 41.709, lon: 44.744 },
  ],
  [
    { lat: 41.712, lon: 44.752 },
    { lat: 41.722, lon: 44.755 },
    { lat: 41.732, lon: 44.757 },
    { lat: 41.742, lon: 44.76 },
  ],
  [
    { lat: 41.742, lon: 44.76 },
    { lat: 41.75, lon: 44.742 },
    { lat: 41.758, lon: 44.731 },
  ],
]

export interface MapDistrict {
  name: string
  nameGe: string
  lat: number
  lon: number
}

// Orientation only — deliberately excludes districts whose name would clash
// with a park label (Vake, Saburtalo).
export const MAP_DISTRICTS: MapDistrict[] = [
  { name: 'Old Town', nameGe: 'ძველი თბილისი', lat: 41.6885, lon: 44.7935 },
  { name: 'Didube', nameGe: 'დიდუბე', lat: 41.7495, lon: 44.7995 },
  { name: 'Mtkvari', nameGe: 'მტკვარი', lat: 41.7245, lon: 44.8125 },
]

// ── Recommendation engine ───────────────────────────────────────────────────

export interface RecommendationInput {
  /** Precipitation now — from the weather card. */
  badWeather: boolean
  tempC: number | null
  userLoc: LatLon | null
}

/** Which condition drove the pick — maps to a `fitness.rec_park_*` i18n key. */
export type RecommendationReason = 'rain' | 'hot' | 'cold' | 'near' | 'mild'

export interface ParkRecommendation {
  park: TbilisiPark
  reason: RecommendationReason
  /** km from the user, when a location is known. */
  distanceKm: number | null
}

const HOT_C = 26
const COLD_C = 5

function scorePark(park: TbilisiPark, input: RecommendationInput): number {
  const { badWeather, tempC, userLoc } = input
  let score = 0

  if (badWeather) score += park.rainFriendly ? 3 : -2
  if (tempC !== null && tempC >= HOT_C) {
    if (park.shaded) score += 2.5
    if (park.water) score += 1
  }
  if (tempC !== null && tempC <= COLD_C && park.rainFriendly) score += 1.5

  // Mild and dry: reward the longer, greener routes.
  const mild = !badWeather && tempC !== null && tempC > COLD_C && tempC < HOT_C
  if (mild) score += Math.min(park.loopKm, 5) * 0.4

  if (park.lit) score += 0.4

  // Proximity dominates once we know where the user is — a great park 6 km
  // away is not the one they will actually walk to today.
  if (userLoc) score -= Math.min(haversineKm(userLoc, park), 12) * 0.9

  return score
}

function reasonFor(
  park: TbilisiPark,
  input: RecommendationInput,
  distanceKm: number | null,
): RecommendationReason {
  if (input.badWeather && park.rainFriendly) return 'rain'
  if (input.tempC !== null && input.tempC >= HOT_C && park.shaded) return 'hot'
  if (input.tempC !== null && input.tempC <= COLD_C) return 'cold'
  if (distanceKm !== null && distanceKm <= 1.5) return 'near'
  return 'mild'
}

/**
 * Pick one spot from weather + location. Returns the winner plus the reason
 * to render, so the copy always explains itself.
 */
export function recommendPark(
  input: RecommendationInput,
  parks: TbilisiPark[] = TBILISI_PARKS,
): ParkRecommendation | null {
  if (parks.length === 0) return null
  const best = parks.reduce((a, b) => (scorePark(b, input) > scorePark(a, input) ? b : a))
  const distanceKm = input.userLoc ? haversineKm(input.userLoc, best) : null
  return { park: best, reason: reasonFor(best, input, distanceKm), distanceKm }
}

/** Parks sorted by distance when a location is known, else weather-first. */
export function sortParks(parks: TbilisiPark[], input: RecommendationInput): TbilisiPark[] {
  const list = [...parks]
  if (input.userLoc) {
    const loc = input.userLoc
    return list.sort((a, b) => haversineKm(loc, a) - haversineKm(loc, b))
  }
  if (input.badWeather) {
    return list.sort((a, b) => Number(b.rainFriendly) - Number(a.rainFriendly))
  }
  return list
}
