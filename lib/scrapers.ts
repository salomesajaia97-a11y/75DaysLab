import * as cheerio from 'cheerio'

export interface ScrapedRecipe {
  title: string
  sourceUrl: string
  sourceSite: 'seriouseats' | 'skinnytaste'
  imageUrl?: string
  calories?: number
  cookTimeMin?: number
  prepTimeMin?: number
  totalTimeMin?: number
  servings?: number
  description?: string
  category?: string
  tags: string[]
  ingredients?: string[]
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
}

function parseISODuration(iso?: string): number | undefined {
  if (!iso) return undefined
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!m) return undefined
  const result = (parseInt(m[1] ?? '0') * 60) + parseInt(m[2] ?? '0')
  return result > 0 ? result : undefined
}

function parseCalories(val?: string | number): number | undefined {
  if (!val) return undefined
  if (typeof val === 'number') return Math.round(val)
  const n = parseInt(String(val).replace(/[^\d.]/g, ''))
  return isNaN(n) ? undefined : Math.round(n)
}

function parseServings(val?: string | number): number | undefined {
  if (!val) return undefined
  if (typeof val === 'number') return val
  const n = parseInt(String(val).replace(/[^\d]/g, ''))
  return isNaN(n) ? undefined : n
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function extractJsonLd(html: string): Record<string, unknown> | null {
  const $ = cheerio.load(html)
  let found: Record<string, unknown> | null = null

  $('script[type="application/ld+json"]').each((_, el) => {
    if (found) return
    try {
      const raw = JSON.parse($(el).html() ?? '')
      const items: unknown[] = Array.isArray(raw)
        ? raw
        : raw['@graph']
        ? (raw['@graph'] as unknown[])
        : [raw]
      for (const item of items) {
        const obj = item as Record<string, unknown>
        const t = obj['@type']
        if (t === 'Recipe' || (Array.isArray(t) && (t as string[]).includes('Recipe'))) {
          found = obj
          break
        }
      }
    } catch { /* skip malformed */ }
  })

  return found
}

export async function scrapeRecipePage(
  url: string,
  site: 'seriouseats' | 'skinnytaste'
): Promise<ScrapedRecipe | null> {
  const html = await fetchHtml(url)
  if (!html) return null

  const ld = extractJsonLd(html)
  if (!ld) return null

  const title = String(ld['name'] ?? '').trim()
  if (!title) return null

  // Image: can be string, array, or ImageObject
  const imgRaw = ld['image']
  const imageUrl: string | undefined =
    typeof imgRaw === 'string' ? imgRaw :
    Array.isArray(imgRaw) ? (typeof imgRaw[0] === 'string' ? imgRaw[0] : (imgRaw[0] as Record<string, string>)?.url) :
    typeof imgRaw === 'object' && imgRaw !== null ? (imgRaw as Record<string, string>)['url'] :
    undefined

  const nutrition = ld['nutrition'] as Record<string, unknown> | undefined
  const calories = parseCalories(nutrition?.['calories'] as string | number)
  const cookTimeMin = parseISODuration(ld['cookTime'] as string)
  const prepTimeMin = parseISODuration(ld['prepTime'] as string)
  const totalTimeMin = parseISODuration(ld['totalTime'] as string) ?? (cookTimeMin && prepTimeMin ? cookTimeMin + prepTimeMin : cookTimeMin ?? prepTimeMin)
  const servings = parseServings(ld['recipeYield'] as string | number)
  const description = String(ld['description'] ?? '').substring(0, 500).trim() || undefined

  const rawCat = ld['recipeCategory']
  const category = (Array.isArray(rawCat) ? rawCat[0] : rawCat) as string | undefined

  const rawKeywords = ld['keywords']
  const tags: string[] = typeof rawKeywords === 'string'
    ? rawKeywords.split(',').map((t: string) => t.trim()).filter(Boolean).slice(0, 10)
    : Array.isArray(rawKeywords)
    ? (rawKeywords as string[]).slice(0, 10)
    : []

  const rawIngredients = ld['recipeIngredient']
  const ingredients: string[] = Array.isArray(rawIngredients)
    ? (rawIngredients as string[]).slice(0, 20)
    : []

  return {
    title, sourceUrl: url, sourceSite: site,
    imageUrl, calories, cookTimeMin, prepTimeMin, totalTimeMin,
    servings, description, category, tags, ingredients,
  }
}

/** Get recipe URLs from SkinnyTaste's XML sitemap */
export async function getRecipeUrlsSkinnyTaste(sitemapUrl: string, limit = 15): Promise<string[]> {
  const SKIP = /cookbook|vacation|remodel|guides|tips-for|how-to|about|contact|shop|category|page-sitemap|web-story|round-?up|top-\d+/i

  try {
    const res = await fetch(sitemapUrl, {
      headers: { 'User-Agent': HEADERS['User-Agent'] },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    const urls: string[] = []
    const matches = xml.matchAll(/<loc>([^<]+)<\/loc>/g)
    for (const m of matches) {
      const u = m[1].trim()
      if (u.includes('skinnytaste.com') && !SKIP.test(u) && u.endsWith('/')) {
        urls.push(u.replace(/\/$/, ''))
      }
      if (urls.length >= limit) break
    }
    return urls
  } catch {
    return []
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
