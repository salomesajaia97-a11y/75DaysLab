// lib/grocery/match.ts
import { openRouterClient } from '@/lib/ai'
import { GroceryPrice } from '@/models/GroceryPrice'
import { RETAILERS } from './types'
import type { Retailer, MatchedIngredient, PriceMatch, Basket } from './types'

const UNIT_RE = /^(kg|g|gram|grams|cup|cups|tbsp|tsp|teaspoon|tablespoon|oz|ounce|ounces|lb|lbs|ml|l|clove|cloves|slice|slices|can|cans|piece|pieces|large|small|medium|ripe|fresh|dried|ground|whole)$/i
const QTY_RE = /^[\d¼½¾⅓⅔⅛/.\-]+$/

export function stripToFoodTerm(ingredient: string): string {
  // drop parentheticals and anything after a comma
  let s = ingredient.replace(/\(.*?\)/g, ' ').split(',')[0]
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
