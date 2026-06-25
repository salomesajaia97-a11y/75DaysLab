// lib/grocery/match.ts
import { openRouterClient } from '@/lib/ai'
import { GroceryPrice } from '@/models/GroceryPrice'
import { RETAILERS } from './types'
import type { Retailer, MatchedIngredient, PriceMatch, Basket } from './types'

const UNIT_RE = /^(kg|g|gram|grams|cup|cups|tbsp|tsp|teaspoon|tablespoon|oz|ounce|ounces|lb|lbs|ml|l|clove|cloves|slice|slices|can|cans|piece|pieces|large|small|medium|ripe|fresh|dried|ground|whole)$/i
const QTY_RE = /^[\d¼½¾⅓⅔⅛/.\-]+$/

export function stripToFoodTerm(ingredient: string): string {
  // drop parentheticals and anything after a comma
  const s = ingredient.replace(/\(.*?\)/g, ' ').split(',')[0]
  const tokens = s.trim().split(/\s+/)
  // drop leading quantity + unit/adjective tokens
  while (tokens.length > 1 && (QTY_RE.test(tokens[0]) || UNIT_RE.test(tokens[0]))) {
    tokens.shift()
  }
  return tokens.join(' ').trim().toLowerCase()
}

export function buildBaskets(items: MatchedIngredient[]): Basket[] {
  return RETAILERS.map((retailer: Retailer): Basket => {
    let total = 0
    const missing: string[] = []
    for (const item of items) {
      const m = item.matches.find(x => x.retailer === retailer)
      if (m) total += m.price
      else missing.push(item.term)
    }
    return { retailer, total: Math.round(total * 100) / 100, missing }
  })
}

function normalizeGe(s: string): string {
  return s.toLowerCase().trim()
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** One batched AI call: English food terms -> Georgian search terms. Translation only, no prices. */
export async function translateTerms(terms: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(terms)].filter(Boolean)
  if (unique.length === 0) return {}
  const prompt = `Translate each English grocery food term to its common Georgian product name (single word or short phrase as a Georgian shopper would search). Return ONLY a JSON object mapping the English term to the Georgian term. No prices, no extra text.\nTerms: ${JSON.stringify(unique)}`
  try {
    const completion = await openRouterClient.chat.completions.create({
      model: 'meta-llama/llama-3.1-8b-instruct',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
    })
    const raw = completion.choices[0]?.message?.content ?? ''
    const json = raw.match(/\{[\s\S]*\}/)
    if (!json) return {}
    const parsed = JSON.parse(json[0]) as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string' && v.trim()) out[k.toLowerCase()] = v.trim()
    }
    return out
  } catch (err) {
    console.error('[grocery/translateTerms]', err instanceof Error ? err.message : String(err))
    return {}
  }
}

export async function matchIngredients(ingredients: string[]): Promise<MatchedIngredient[]> {
  const terms = ingredients.map(stripToFoodTerm)
  const translations = await translateTerms(terms)

  const out: MatchedIngredient[] = []
  for (let i = 0; i < ingredients.length; i++) {
    const term = terms[i]
    const termGe = translations[term]
    const matches: PriceMatch[] = []
    if (termGe) {
      const search = normalizeGe(termGe)
      const safe = escapeRegex(search.split(/\s+/)[0])
      for (const retailer of RETAILERS) {
        try {
          const row = await GroceryPrice.findOne({
            retailer,
            searchText: { $regex: safe, $options: 'i' },
          }).sort({ price: 1 }).lean<{ productName: string; price: number; unit?: string; sourceUrl: string; scrapedAt: Date } | null>()
          if (row) {
            matches.push({
              retailer,
              productName: row.productName,
              price: row.price,
              unit: row.unit,
              sourceUrl: row.sourceUrl,
              scrapedAt: row.scrapedAt.toISOString(),
            })
          }
        } catch (err) {
          console.error('[grocery/matchIngredients] lookup failed', retailer, err instanceof Error ? err.message : String(err))
        }
      }
    }
    out.push({ ingredient: ingredients[i], term, termGe, matches })
  }
  return out
}
