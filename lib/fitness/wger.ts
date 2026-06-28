// Lightweight client for the open-source wger.de exercise API.
// We pull exercise names + their illustration images so the dashboard can
// alternate between two phases of a movement (start/end) to fake a GIF.
//
// Reality check: only a handful of wger exercises ship ≥2 images, so we fetch
// a wide page and surface the animatable ones first, then fall back to static
// single-image cards. wger images are CC-BY-SA absolute https URLs, so a plain
// <img> renders them without any next.config image-domain changes.

export type IndoorFocus = 'full' | 'core' | 'upper' | 'lower' | 'cardio' | 'yoga'

export interface WgerExercise {
  id: number
  name: string
  /** Ordered, de-duped image URLs (main image first). */
  images: string[]
  /** True when there are ≥2 images and the loop animation applies. */
  animated: boolean
}

const WGER_BASE = 'https://wger.de/api/v2'
const ENGLISH = 2 // wger language id for English

// wger exercise category ids:
// 10 Abs · 8 Arms · 12 Back · 14 Calves · 11 Chest · 9 Legs · 13 Shoulders
// Each focus picks the most representative category; `null` means no filter
// (a general mix), used where wger has no dedicated category.
const FOCUS_CATEGORY: Record<IndoorFocus, number | null> = {
  full: null,
  core: 10,
  upper: 11,
  lower: 9,
  cardio: 9, // wger has no cardio category — dynamic leg movements are the closest
  yoga: null, // no yoga category — show a general mix of bodyweight holds
}

interface InfoImage {
  image: string
  is_main: boolean
}
interface InfoTranslation {
  language: number
  name: string
}
interface InfoResult {
  id: number
  images: InfoImage[]
  translations: InfoTranslation[]
}

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`wger ${res.status}`)
  return res.json() as Promise<T>
}

/**
 * Fetches up to `limit` exercises for a focus, each with its images.
 * Throws on network/HTTP failure so callers can render an error state.
 * Returns [] (not an error) when wger has nothing illustrated for the focus.
 */
export async function fetchWgerExercises(
  focus: IndoorFocus,
  limit = 8,
  timeoutMs = 8000,
): Promise<WgerExercise[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const category = FOCUS_CATEGORY[focus]
    const catParam = category != null ? `&category=${category}` : ''
    // /exerciseinfo returns images + translations together, in one request.
    const data = await getJson<{ results: InfoResult[] }>(
      `${WGER_BASE}/exerciseinfo/?language=${ENGLISH}&limit=80&format=json${catParam}`,
      controller.signal,
    )

    const out: WgerExercise[] = []
    for (const r of data.results) {
      const withUrl = r.images.filter(i => i.image)
      if (withUrl.length === 0) continue

      // Main image first, then de-dupe.
      const ordered = [...withUrl]
        .sort((a, b) => Number(b.is_main) - Number(a.is_main))
        .map(i => i.image)
      const images = [...new Set(ordered)]

      const tr = r.translations.find(t => t.language === ENGLISH) ?? r.translations[0]
      const name = tr?.name?.trim()
      if (!name) continue

      out.push({ id: r.id, name, images, animated: images.length >= 2 })
    }

    // Animatable (≥2 image) exercises first — they're the point of the loop.
    out.sort((a, b) => Number(b.animated) - Number(a.animated))
    return out.slice(0, limit)
  } finally {
    clearTimeout(timer)
  }
}
