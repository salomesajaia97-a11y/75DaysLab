// lib/ai/intent.ts
export type ChatIntent = 'chat' | 'grocery_price' | 'recipe_web' | 'cook_from_pantry'

const PRICE_RE = /\b(where.*(buy|get)|cheap(est)?|price|how much.*cost|buy.*cheap)\b/i
const PANTRY_RE = /\b(i have|i've got|i got|what can i (cook|make)|cook with|make with)\b/i
const RECIPE_RE = /\b(recipe for|recipe of|how (do|to|can) i (make|cook)|how to make|give me a recipe)\b/i

export function classifyIntent(msg: string): ChatIntent {
  const m = msg.toLowerCase()
  // order matters: pantry ("what can I cook with X") beats recipe; price is most specific
  if (PRICE_RE.test(m) && !PANTRY_RE.test(m)) return 'grocery_price'
  if (PANTRY_RE.test(m)) return 'cook_from_pantry'
  if (RECIPE_RE.test(m)) return 'recipe_web'
  return 'chat'
}

function splitList(s: string): string[] {
  return s
    .split(/,|\band\b|\bor\b|\+/i)
    .map(x => x.replace(/\b(at home|in (my )?fridge|left)\b/gi, '').trim())
    .filter(Boolean)
}

export function parsePantryItems(msg: string): string[] {
  const m = msg.toLowerCase()
  let after = ''
  const have = m.match(/i (?:have|'ve got|got)\s+(.+?)(?:\.|$|, what| what)/)
  const make = m.match(/(?:cook|make) with\s+(.+?)(?:\.|$|, what| what)/)
  if (have) after = have[1]
  else if (make) after = make[1]
  else return []
  return splitList(after).slice(0, 15)
}

export function extractPriceTerm(msg: string): string {
  let m = msg.toLowerCase().trim().replace(/[?.!]+$/, '')
  m = m.replace(/^.*\b(buy|get|price (for|of)|cost of|cheapest (price )?(for|of)?)\b/i, '')
  m = m.replace(/\b(cheap(est)?|near me|at home|right now|please)\b/gi, '')
  m = m.replace(/\b(where|can|i|the|a|an|to|is|are)\b/gi, '')
  return m.replace(/\s+/g, ' ').trim()
}
