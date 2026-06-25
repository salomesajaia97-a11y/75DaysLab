// lib/recipes/extract.ts
import * as cheerio from 'cheerio'
import type { WebRecipe } from './types'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function parseISODuration(iso?: string): number | undefined {
  if (!iso) return undefined
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!m) return undefined
  const r = (parseInt(m[1] ?? '0') * 60) + parseInt(m[2] ?? '0')
  return r > 0 ? r : undefined
}

function domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

function findRecipeObject(html: string): Record<string, unknown> | null {
  const $ = cheerio.load(html)
  let found: Record<string, unknown> | null = null
  $('script[type="application/ld+json"]').each((_, el) => {
    if (found) return
    try {
      const raw = JSON.parse($(el).html() ?? '')
      const items: unknown[] = Array.isArray(raw) ? raw : raw['@graph'] ? raw['@graph'] : [raw]
      for (const item of items) {
        const obj = item as Record<string, unknown>
        const t = obj['@type']
        if (t === 'Recipe' || (Array.isArray(t) && (t as string[]).includes('Recipe'))) { found = obj; break }
      }
    } catch { /* skip malformed */ }
  })
  return found
}

function mapInstructions(raw: unknown): string[] {
  const out: string[] = []
  if (typeof raw === 'string') out.push(raw)
  else if (Array.isArray(raw)) {
    for (const step of raw) {
      if (typeof step === 'string') out.push(step)
      else if (step && typeof step === 'object') {
        const s = step as Record<string, unknown>
        if (s['@type'] === 'HowToSection') {
          for (const sub of (s['itemListElement'] as unknown[] ?? [])) {
            const t = (sub as Record<string, unknown>)?.['text'] as string
            if (t) out.push(t)
          }
        } else {
          const t = (s['text'] ?? s['name']) as string
          if (t) out.push(t)
        }
      }
    }
  }
  return out.map(s => s.trim()).filter(Boolean)
}

export function parseRecipeJsonLd(html: string, sourceUrl: string): WebRecipe | null {
  const ld = findRecipeObject(html)
  if (!ld) return null
  const title = String(ld['name'] ?? '').trim()
  if (!title) return null

  const ingredients = (Array.isArray(ld['recipeIngredient']) ? (ld['recipeIngredient'] as string[]) : [])
    .map(s => String(s).trim()).filter(Boolean).slice(0, 40)
  const instructions = mapInstructions(ld['recipeInstructions']).slice(0, 40)

  const imgRaw = ld['image']
  const imageUrl: string | undefined =
    typeof imgRaw === 'string' ? imgRaw :
    Array.isArray(imgRaw) ? (typeof imgRaw[0] === 'string' ? imgRaw[0] : (imgRaw[0] as Record<string, string>)?.url) :
    (imgRaw && typeof imgRaw === 'object') ? (imgRaw as Record<string, string>)['url'] : undefined

  const yieldRaw = ld['recipeYield']
  const servings = Array.isArray(yieldRaw) ? String(yieldRaw[0]) : yieldRaw ? String(yieldRaw) : undefined

  return {
    title,
    ingredients,
    instructions,
    totalTimeMin: parseISODuration(ld['totalTime'] as string),
    servings,
    imageUrl,
    sourceDomain: domainOf(sourceUrl),
  }
}

export async function extractRecipe(url: string): Promise<WebRecipe | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(12000) })
    if (!res.ok) return null
    const html = await res.text()
    return parseRecipeJsonLd(html, url)
  } catch { return null }
}
