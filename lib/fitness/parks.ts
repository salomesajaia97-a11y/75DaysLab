// Curated Tbilisi walking/running destinations, covering every major district.
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
  /** Neighbourhood the spot belongs to — shown on the card. */
  district: string
  districtGe: string
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
    district: 'Vake',
    districtGe: 'ვაკე',
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
    slug: 'lisi-lake',
    name: 'Lisi Lake',
    nameGe: 'ლისის ტბა',
    district: 'Saburtalo / Nutsubidze',
    districtGe: 'საბურთალო / ნუცუბიძე',
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
    slug: 'turtle-lake',
    name: 'Turtle Lake',
    nameGe: 'კუს ტბა',
    district: 'Vake',
    districtGe: 'ვაკე',
    blurb: 'Elevated lakeside trail with fresh air and city views.',
    blurbGe: 'მაღლა მდებარე ბილიკი ტბის გარშემო — სუფთა ჰაერი და ქალაქის ხედები.',
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
  {
    slug: 'mziuri-park',
    name: 'Mziuri Park',
    nameGe: 'მზიური',
    district: 'Vake / Saburtalo',
    districtGe: 'ვაკე / საბურთალო',
    blurb: 'Cozy green ravine park along the Vere, sheltered from traffic.',
    blurbGe: 'მყუდრო მწვანე პარკი ვერეს ხეობაში, დაცული ხმაურისგან.',
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
    slug: 'rike-park',
    name: 'Rike Park',
    nameGe: 'რიყის პარკი',
    district: 'Old Tbilisi / Avlabari',
    districtGe: 'ძველი თბილისი / ავლაბარი',
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
    slug: 'dedaena-park',
    name: 'Dedaena Park',
    nameGe: 'დედაენის პარკი',
    district: 'Dry Bridge / Centre',
    districtGe: 'მშრალი ხიდი / ცენტრი',
    blurb: 'Lively riverside park with flat paths and an open lawn.',
    blurbGe: 'ცოცხალი პარკი მდინარესთან — ბრტყელი ბილიკები და ღია მოედანი.',
    mapLabel: 'Dedaena',
    mapLabelGe: 'დედაენა',
    labelDy: -3.4,
    activity: 'both',
    rainFriendly: true,
    lat: 41.6952,
    lon: 44.8022,
    shaded: false,
    lit: true,
    loopKm: 1.2,
  },
  {
    slug: 'nine-april-park',
    name: '9 April Park',
    nameGe: '9 აპრილის პარკი',
    district: 'Rustaveli / Centre',
    districtGe: 'რუსთაველი / ცენტრი',
    blurb: 'Quiet historic paths under old trees, right on Rustaveli.',
    blurbGe: 'წყნარი ისტორიული ბილიკები ძველი ხეების ჩრდილში, რუსთაველზე.',
    mapLabel: '9 April',
    mapLabelGe: '9 აპრილი',
    activity: 'walk',
    rainFriendly: true,
    lat: 41.6978,
    lon: 44.7975,
    shaded: true,
    lit: true,
    loopKm: 0.9,
  },
  {
    slug: 'vera-park',
    name: 'Vera Park',
    nameGe: 'ვერის პარკი',
    district: 'Vera',
    districtGe: 'ვერა',
    blurb: 'Compact neighbourhood green space with shaded benches.',
    blurbGe: 'კომპაქტური სამეზობლო მწვანე სივრცე ჩრდილიანი სკამებით.',
    mapLabel: 'Vera',
    mapLabelGe: 'ვერა',
    activity: 'walk',
    rainFriendly: true,
    lat: 41.7078,
    lon: 44.7858,
    shaded: true,
    lit: true,
    loopKm: 0.8,
  },
  {
    slug: 'saburtalo-central-park',
    name: 'Saburtalo Central Park',
    nameGe: 'საბურთალოს ცენტრალური პარკი',
    district: 'Saburtalo',
    districtGe: 'საბურთალო',
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
    slug: 'kikvidze-park',
    name: 'Kikvidze Park',
    nameGe: 'კიკვიძის პარკი',
    district: 'Didube / Nadzaladevi',
    districtGe: 'დიდუბე / ნაძალადევი',
    blurb: 'Large shaded park with wide alleys for an unhurried loop.',
    blurbGe: 'დიდი ჩრდილიანი პარკი ფართო ხეივნებით მშვიდი მარშრუტისთვის.',
    mapLabel: 'Kikvidze',
    mapLabelGe: 'კიკვიძე',
    activity: 'both',
    rainFriendly: true,
    lat: 41.7565,
    lon: 44.7885,
    shaded: true,
    lit: true,
    loopKm: 1.6,
  },
  {
    slug: 'mushtaidi-park',
    name: 'Mushtaidi Park',
    nameGe: 'მუშთაიდის პარკი',
    district: 'Didube / Chughureti',
    districtGe: 'დიდუბე / ჩუღურეთი',
    blurb: 'Historic park with a dense tree canopy — cool even at midday.',
    blurbGe: 'ისტორიული პარკი ხშირი ხეებით — გრილია შუადღისასაც.',
    mapLabel: 'Mushtaidi',
    mapLabelGe: 'მუშთაიდი',
    activity: 'walk',
    rainFriendly: true,
    lat: 41.7358,
    lon: 44.7935,
    shaded: true,
    lit: true,
    loopKm: 1.3,
  },
  {
    slug: 'digomi-forest-park',
    name: 'Digomi Forest Park',
    nameGe: 'დიღმის ტყე-პარკი',
    district: 'Digomi',
    districtGe: 'დიღომი',
    blurb: 'Large natural green area — the pick for longer trail runs.',
    blurbGe: 'დიდი ბუნებრივი მწვანე ზონა — საუკეთესო გრძელი სირბილისთვის.',
    mapLabel: 'Digomi',
    mapLabelGe: 'დიღომი',
    activity: 'run',
    rainFriendly: false,
    lat: 41.783,
    lon: 44.762,
    shaded: true,
    lit: false,
    loopKm: 6,
  },
  {
    slug: 'gldani-park',
    name: 'Gldani Park',
    nameGe: 'გლდანის პარკი',
    district: 'Gldani',
    districtGe: 'გლდანი',
    blurb: 'Active recreational space serving the northern districts.',
    blurbGe: 'აქტიური დასასვენებელი სივრცე ჩრდილოეთ უბნებისთვის.',
    mapLabel: 'Gldani',
    mapLabelGe: 'გლდანი',
    activity: 'both',
    rainFriendly: true,
    lat: 41.793,
    lon: 44.8135,
    shaded: false,
    lit: true,
    loopKm: 1.5,
  },
  {
    slug: 'temka-park',
    name: 'Temka Park / Sea Plaza',
    nameGe: 'თემქის პარკი / ზღვის პლაზა',
    district: 'Temka / Tbilisi Sea',
    districtGe: 'თემქა / თბილისის ზღვა',
    blurb: 'Open breezy paths near the Tbilisi Sea — wide horizons.',
    blurbGe: 'ღია, ნიავიანი ბილიკები თბილისის ზღვასთან — ფართო ხედები.',
    mapLabel: 'Temka',
    mapLabelGe: 'თემქა',
    activity: 'both',
    rainFriendly: false,
    lat: 41.784,
    lon: 44.848,
    shaded: false,
    lit: false,
    loopKm: 2.5,
    water: true,
  },
  {
    slug: 'botanical-garden',
    name: 'Tbilisi Botanical Garden',
    nameGe: 'თბილისის ბოტანიკური ბაღი',
    district: 'Sololaki / Abanotubani',
    districtGe: 'სოლოლაკი / აბანოთუბანი',
    blurb: 'Scenic gorge paths with real elevation change — legs get work.',
    blurbGe: 'ულამაზესი ბილიკები ხეობაში ნამდვილი აღმართებით — ფეხები დაიტვირთება.',
    mapLabel: 'Botanical',
    mapLabelGe: 'ბოტანიკური',
    labelDy: -3.4,
    activity: 'both',
    rainFriendly: false,
    lat: 41.6885,
    lon: 44.806,
    shaded: true,
    lit: false,
    loopKm: 2,
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

// ── Place search ────────────────────────────────────────────────────────────
// A local gazetteer of Tbilisi districts, metro stops and landmarks. Typing a
// neighbourhood resolves to coordinates with no geocoding service, no API key
// and no network round-trip — and it works in Georgian as well as English.

export interface TbilisiPlace {
  name: string
  nameGe: string
  lat: number
  lon: number
}

export const TBILISI_PLACES: TbilisiPlace[] = [
  { name: 'Vake', nameGe: 'ვაკე', lat: 41.7085, lon: 44.756 },
  { name: 'Bagebi', nameGe: 'ბაგები', lat: 41.7245, lon: 44.7185 },
  { name: 'Vashlijvari', nameGe: 'ვაშლიჯვარი', lat: 41.7482, lon: 44.7502 },
  { name: 'Saburtalo', nameGe: 'საბურთალო', lat: 41.733, lon: 44.762 },
  { name: 'Nutsubidze Plateau', nameGe: 'ნუცუბიძის პლატო', lat: 41.742, lon: 44.73 },
  { name: 'Delisi', nameGe: 'დელისი', lat: 41.7285, lon: 44.7605 },
  { name: 'Vazha-Pshavela', nameGe: 'ვაჟა-ფშაველა', lat: 41.7255, lon: 44.7495 },
  { name: 'State University', nameGe: 'სახელმწიფო უნივერსიტეტი', lat: 41.7238, lon: 44.7405 },
  { name: 'Vera', nameGe: 'ვერა', lat: 41.7075, lon: 44.783 },
  { name: 'Mtatsminda', nameGe: 'მთაწმინდა', lat: 41.695, lon: 44.786 },
  { name: 'Sololaki', nameGe: 'სოლოლაკი', lat: 41.6905, lon: 44.7965 },
  { name: 'Rustaveli', nameGe: 'რუსთაველი', lat: 41.6975, lon: 44.7995 },
  { name: 'Freedom Square', nameGe: 'თავისუფლების მოედანი', lat: 41.6934, lon: 44.8015 },
  { name: 'Abanotubani', nameGe: 'აბანოთუბანი', lat: 41.6905, lon: 44.809 },
  { name: 'Avlabari', nameGe: 'ავლაბარი', lat: 41.6935, lon: 44.813 },
  { name: 'Ortachala', nameGe: 'ორთაჭალა', lat: 41.6752, lon: 44.8215 },
  { name: 'Krtsanisi', nameGe: 'კრწანისი', lat: 41.669, lon: 44.8225 },
  { name: 'Marjanishvili', nameGe: 'მარჯანიშვილი', lat: 41.7062, lon: 44.7962 },
  { name: 'Chughureti', nameGe: 'ჩუღურეთი', lat: 41.7075, lon: 44.804 },
  { name: 'Station Square', nameGe: 'სადგურის მოედანი', lat: 41.7182, lon: 44.794 },
  { name: 'Didube', nameGe: 'დიდუბე', lat: 41.744, lon: 44.793 },
  { name: 'Nadzaladevi', nameGe: 'ნაძალადევი', lat: 41.762, lon: 44.794 },
  { name: 'Digomi', nameGe: 'დიღომი', lat: 41.7828, lon: 44.7742 },
  { name: 'Gldani', nameGe: 'გლდანი', lat: 41.793, lon: 44.8125 },
  { name: 'Mukhiani', nameGe: 'მუხიანი', lat: 41.7968, lon: 44.7975 },
  { name: 'Temka', nameGe: 'თემქა', lat: 41.7842, lon: 44.8442 },
  { name: 'Tbilisi Sea', nameGe: 'თბილისის ზღვა', lat: 41.7755, lon: 44.8605 },
  { name: 'Isani', nameGe: 'ისანი', lat: 41.6838, lon: 44.8342 },
  { name: 'Samgori', nameGe: 'სამგორი', lat: 41.6893, lon: 44.849 },
  { name: 'Vazisubani', nameGe: 'ვაზისუბანი', lat: 41.7005, lon: 44.8618 },
  { name: 'Varketili', nameGe: 'ვარკეთილი', lat: 41.689, lon: 44.8805 },
  { name: 'Navtlughi', nameGe: 'ნავთლუღი', lat: 41.6742, lon: 44.8452 },
]

/** Strip diacritics/case/punctuation so "Vazha-Pshavela" matches "vazha pshavela". */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

export interface PlaceHit extends LatLon {
  /** English label, used as a stable key. */
  name: string
  nameGe: string
  /** True when the hit is one of the parks rather than a neighbourhood. */
  isPark: boolean
}

/**
 * Search neighbourhoods, landmarks and the parks themselves. Prefix matches
 * rank above substring matches so short queries land on the obvious answer.
 */
export function searchPlaces(query: string, limit = 6): PlaceHit[] {
  const q = normalize(query)
  if (q.length < 2) return []

  const candidates: PlaceHit[] = [
    ...TBILISI_PLACES.map(p => ({ ...p, isPark: false })),
    ...TBILISI_PARKS.map(p => ({
      name: p.name,
      nameGe: p.nameGe,
      lat: p.lat,
      lon: p.lon,
      isPark: true,
    })),
  ]

  const scored: { hit: PlaceHit; score: number }[] = []
  for (const hit of candidates) {
    const fields = [normalize(hit.name), normalize(hit.nameGe)]
    let score = -1
    for (const f of fields) {
      if (f.startsWith(q)) score = Math.max(score, 2)
      else if (f.includes(q)) score = Math.max(score, 1)
    }
    // Neighbourhoods answer "where am I", so they outrank parks on ties.
    if (score >= 0) scored.push({ hit, score: score * 2 + (hit.isPark ? 0 : 1) })
  }

  return scored
    .sort((a, b) => b.score - a.score || a.hit.name.localeCompare(b.hit.name))
    .slice(0, limit)
    .map(s => s.hit)
}

// ── Map projection ──────────────────────────────────────────────────────────
// Fixed bounding box around the curated spots. Equirectangular projection is
// fine at this scale (~16 km across) and keeps click → coordinate reversible.

export const MAP_BOUNDS = {
  latMin: 41.665,
  latMax: 41.81,
  lonMin: 44.7,
  lonMax: 44.89,
} as const

/** viewBox dimensions chosen so 1 unit of x and y cover the same distance. */
export const MAP_VIEW = { w: 100, h: 102 } as const

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
  { lat: 41.665, lon: 44.842 },
  { lat: 41.672, lon: 44.832 },
  { lat: 41.682, lon: 44.822 },
  { lat: 41.688, lon: 44.812 },
  { lat: 41.694, lon: 44.806 },
  { lat: 41.7, lon: 44.802 },
  { lat: 41.708, lon: 44.797 },
  { lat: 41.716, lon: 44.792 },
  { lat: 41.726, lon: 44.788 },
  { lat: 41.736, lon: 44.786 },
  { lat: 41.746, lon: 44.782 },
  { lat: 41.756, lon: 44.772 },
  { lat: 41.768, lon: 44.766 },
  { lat: 41.782, lon: 44.77 },
  { lat: 41.795, lon: 44.778 },
  { lat: 41.81, lon: 44.782 },
]

/** Decorative main-avenue hints so the map reads as a city, not a scatter plot. */
export const MAP_ROADS: LatLon[][] = [
  // Rustaveli → Chavchavadze, west through Vake
  [
    { lat: 41.697, lon: 44.8 },
    { lat: 41.703, lon: 44.79 },
    { lat: 41.707, lon: 44.775 },
    { lat: 41.709, lon: 44.76 },
    { lat: 41.709, lon: 44.744 },
  ],
  // Saburtalo spine, north to Didube
  [
    { lat: 41.712, lon: 44.752 },
    { lat: 41.722, lon: 44.755 },
    { lat: 41.732, lon: 44.757 },
    { lat: 41.742, lon: 44.762 },
    { lat: 41.748, lon: 44.782 },
  ],
  // Lisi road
  [
    { lat: 41.742, lon: 44.762 },
    { lat: 41.75, lon: 44.742 },
    { lat: 41.758, lon: 44.731 },
  ],
  // Didube → Gldani / Mukhiani
  [
    { lat: 41.748, lon: 44.792 },
    { lat: 41.766, lon: 44.798 },
    { lat: 41.782, lon: 44.804 },
    { lat: 41.793, lon: 44.812 },
  ],
  // Centre → Isani → Varketili, along the left bank
  [
    { lat: 41.693, lon: 44.812 },
    { lat: 41.686, lon: 44.83 },
    { lat: 41.687, lon: 44.85 },
    { lat: 41.689, lon: 44.874 },
  ],
]

export interface MapDistrict {
  name: string
  nameGe: string
  lat: number
  lon: number
}

/** Orientation labels — the map's own place names, drawn under the markers. */
export const MAP_DISTRICTS: MapDistrict[] = [
  { name: 'Vake', nameGe: 'ვაკე', lat: 41.7015, lon: 44.752 },
  { name: 'Saburtalo', nameGe: 'საბურთალო', lat: 41.7265, lon: 44.7425 },
  { name: 'Old Town', nameGe: 'ძველი თბილისი', lat: 41.6815, lon: 44.8 },
  { name: 'Didube', nameGe: 'დიდუბე', lat: 41.7455, lon: 44.8 },
  { name: 'Gldani', nameGe: 'გლდანი', lat: 41.8055, lon: 44.848 },
  { name: 'Isani', nameGe: 'ისანი', lat: 41.6785, lon: 44.8395 },
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

  // No distance term here — with a location known, proximity is applied as a
  // hard filter in `recommendPark`, not as points weather can outbid.
  if (userLoc) score -= Math.min(haversineKm(userLoc, park), 12) * 0.05

  return score
}

/**
 * Spots effectively as close as the nearest one. Weather decides only inside
 * this band — a shadier park a few hundred metres further never displaces the
 * closest one, because "which is closest" is the question a walker asks.
 */
const TIE_BAND_KM = 0.05
/** How far out of the way a sheltered spot may be when it is raining. */
const RAIN_DETOUR_KM = 1

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
 * The nearest spot plus anything within `TIE_BAND_KM` of it. When it rains and
 * nothing in that band is sheltered, a rain-friendly spot up to
 * `RAIN_DETOUR_KM` further is allowed in — a soaking is worth a short detour.
 */
function nearbyPool(parks: TbilisiPark[], input: RecommendationInput): TbilisiPark[] {
  const loc = input.userLoc
  if (!loc) return parks

  const ranked = parks
    .map(park => ({ park, km: haversineKm(loc, park) }))
    .sort((a, b) => a.km - b.km)

  const nearestKm = ranked[0].km
  const pool = ranked.filter(r => r.km <= nearestKm + TIE_BAND_KM)

  if (input.badWeather && !pool.some(r => r.park.rainFriendly)) {
    const sheltered = ranked.find(
      r => r.park.rainFriendly && r.km <= nearestKm + RAIN_DETOUR_KM,
    )
    if (sheltered) return [sheltered.park]
  }

  return pool.map(r => r.park)
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

  const pool = input.userLoc ? nearbyPool(parks, input) : parks
  const best = pool.reduce((a, b) => (scorePark(b, input) > scorePark(a, input) ? b : a))
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
