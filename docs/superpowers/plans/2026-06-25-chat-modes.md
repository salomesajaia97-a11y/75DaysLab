# LabAI Chat Modes Implementation Plan (Part C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisites:** Part A (grocery price backbone) and Part B (web recipe search) are merged. This plan imports `matchIngredients`/`buildBaskets` from `@/lib/grocery/match` and `findWebRecipes` from `@/lib/recipes/find`.

**Goal:** Make LabAI chat answer three real requests over real data: "I have X,Y at home" (recipe + priced buy-list), "where can I buy X cheapest" (real GroceryPrice), and "recipe for X" (full web recipe inline, no links).

**Architecture:** A pure intent classifier reads the message and returns a mode. The chat route gathers real data server-side for that mode (grocery match and/or web recipe), injects it into the system prompt as labeled blocks, and the model formats an answer constrained to that data. Same inject pattern as the existing USDA `food_log` path — no model tool-calling.

**Tech Stack:** Next.js 16 App Router, OpenRouter (OpenAI SDK), Vitest.

## Global Constraints

- **Prices only from injected `GROCERY PRICE DATA`.** Model must never invent a price; missing → "not available" + official store links.
- **Recipes only from injected `WEB RECIPE` data (or Recipe DB fallback).** Model must not output URLs/source names for web recipes.
- **OpenRouter model:** `meta-llama/llama-3.1-8b-instruct` (paid slug; `:free` is dead).
- **No tool-calling** — intent-detect + context-inject only.
- **Auth + response shape unchanged:** route stays `{ message, macros }`, auth via `@/lib/auth`, 502 on OpenRouter failure.
- **Ambiguous intent → the model asks one clarifying question** rather than guessing.
- **Official store links** (only as static info, never as price claims): Carrefour https://www.carrefour.ge, Agrohub https://agrohub.ge, Nikora https://www.nikora.ge, 2 Nabiji https://2nabiji.ge, Spar https://www.spar-georgia.com, Magniti https://magniti.ge, Smart https://smart.ge.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `lib/ai/intent.ts` | `classifyIntent`, `parsePantryItems`, `extractPriceTerm` (pure) |
| `lib/ai.ts` (modify) | `buildSystemPrompt` accepts `groceryContext` + `webRecipeContext`; new rules + `STORE_LINKS` |
| `app/api/ai/chat/route.ts` (modify) | classify intent, gather real data, inject |

---

### Task 1: Intent classifier (TDD)

**Files:**
- Create: `lib/ai/intent.ts`
- Test: `lib/ai/intent.test.ts`

**Interfaces:**
- Produces: `ChatIntent` type (`'chat' | 'grocery_price' | 'recipe_web' | 'cook_from_pantry'`), `classifyIntent(msg: string): ChatIntent`, `parsePantryItems(msg: string): string[]`, `extractPriceTerm(msg: string): string`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/ai/intent.test.ts
import { describe, it, expect } from 'vitest'
import { classifyIntent, parsePantryItems, extractPriceTerm } from './intent'

describe('classifyIntent', () => {
  it('detects grocery price questions', () => {
    expect(classifyIntent('where can I buy eggs cheapest?')).toBe('grocery_price')
    expect(classifyIntent('cheapest price for chicken')).toBe('grocery_price')
  })
  it('detects pantry-cooking questions', () => {
    expect(classifyIntent('I have eggs, rice and onion at home, what can I cook?')).toBe('cook_from_pantry')
    expect(classifyIntent('what can I make with chicken and potato')).toBe('cook_from_pantry')
  })
  it('detects recipe requests', () => {
    expect(classifyIntent('recipe for shakshuka')).toBe('recipe_web')
    expect(classifyIntent('how do I make khachapuri')).toBe('recipe_web')
  })
  it('falls back to chat', () => {
    expect(classifyIntent('how many pushups should I do today?')).toBe('chat')
  })
})

describe('parsePantryItems', () => {
  it('extracts a comma/and separated list after "I have"', () => {
    expect(parsePantryItems('I have eggs, rice and onion at home')).toEqual(['eggs', 'rice', 'onion'])
  })
  it('handles "make with X and Y"', () => {
    expect(parsePantryItems('what can I make with chicken and potato')).toEqual(['chicken', 'potato'])
  })
})

describe('extractPriceTerm', () => {
  it('pulls the food term out of a price question', () => {
    expect(extractPriceTerm('where can I buy eggs cheapest?')).toBe('eggs')
    expect(extractPriceTerm('cheapest price for chicken breast')).toBe('chicken breast')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/ai/intent.test.ts`
Expected: FAIL — module not found / functions not exported.

- [ ] **Step 3: Implement intent.ts**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/ai/intent.test.ts`
Expected: PASS. (If `extractPriceTerm` over-trims, tighten the stop-word pass so "chicken breast" survives — adjust regex and re-run until green.)

- [ ] **Step 5: Commit**

```bash
git add lib/ai/intent.ts lib/ai/intent.test.ts
git commit -m "feat(chat): intent classifier + pantry/price parsers"
```

---

### Task 2: buildSystemPrompt accepts injected context

**Files:**
- Modify: `lib/ai.ts`

**Interfaces:**
- Consumes: existing `buildSystemPrompt(user, progress, weather, usdaContext)`.
- Produces: extended `buildSystemPrompt(user, progress, weather, usdaContext, groceryContext?, webRecipeContext?)`; exported `STORE_LINKS` string.

- [ ] **Step 1: Add STORE_LINKS + extend the signature**

In `lib/ai.ts`, add near the top:

```ts
export const STORE_LINKS = `Carrefour https://www.carrefour.ge · Agrohub https://agrohub.ge · Nikora https://www.nikora.ge · 2 Nabiji https://2nabiji.ge · Spar https://www.spar-georgia.com · Magniti https://magniti.ge · Smart https://smart.ge`
```

Change the `buildSystemPrompt` signature and append two optional blocks + rules. Add the two params:

```ts
export function buildSystemPrompt(
  user: UserContext,
  progress: ProgressContext,
  weather: WeatherContext | null,
  usdaContext: string | null,
  groceryContext?: string | null,
  webRecipeContext?: string | null,
): string {
```

- [ ] **Step 2: Build the new blocks and rules**

Inside `buildSystemPrompt`, before the final `return`, add:

```ts
  const groceryBlock = groceryContext
    ? `\nGROCERY PRICE DATA (real scraped prices — the ONLY prices you may state):\n${groceryContext}\nRULE: State only prices present above. Never invent or estimate a price. If a needed item is absent, say "not available right now" and point the user to the official stores: ${STORE_LINKS}`
    : ''

  const webRecipeBlock = webRecipeContext
    ? `\nWEB RECIPE (present THIS recipe to the user — ingredients and steps):\n${webRecipeContext}\nRULE: Present this recipe's ingredients and numbered steps clearly. Do NOT output any URL, website name, or source — only the recipe content itself.`
    : ''
```

Then include `${groceryBlock}` and `${webRecipeBlock}` in the returned template string (place them after `${nutritionBlock}`).

- [ ] **Step 3: Verify compile + existing chat still works**

Run: `npx tsc --noEmit`
Expected: no errors. The existing call in `app/api/ai/chat/route.ts` passes 4 args; the two new params are optional, so it still compiles.

- [ ] **Step 4: Commit**

```bash
git add lib/ai.ts
git commit -m "feat(chat): system prompt accepts grocery + web-recipe context"
```

---

### Task 3: Wire intent + real-data injection into the chat route

**Files:**
- Modify: `app/api/ai/chat/route.ts`

**Interfaces:**
- Consumes: `classifyIntent`, `parsePantryItems`, `extractPriceTerm`, `matchIngredients`, `findWebRecipes`, extended `buildSystemPrompt`.

- [ ] **Step 1: Add imports + helpers to format injected context**

At the top of `app/api/ai/chat/route.ts` add:

```ts
import { classifyIntent, parsePantryItems, extractPriceTerm } from '@/lib/ai/intent'
import { matchIngredients } from '@/lib/grocery/match'
import { findWebRecipes } from '@/lib/recipes/find'
import { RETAILER_LABELS } from '@/lib/grocery/types'
import type { MatchedIngredient } from '@/lib/grocery/types'
import type { WebRecipe } from '@/lib/recipes/types'
```

Add these formatting helpers above `POST`:

```ts
function formatGrocery(items: MatchedIngredient[]): string {
  return items.map(it => {
    if (it.matches.length === 0) return `- ${it.term}: not available`
    const lines = it.matches
      .slice().sort((a, b) => a.price - b.price)
      .map(m => `${RETAILER_LABELS[m.retailer]} ₾${m.price.toFixed(2)}${m.unit ? '/' + m.unit : ''}`)
      .join(', ')
    return `- ${it.term}: ${lines}`
  }).join('\n')
}

function formatWebRecipe(r: WebRecipe): string {
  return `Title: ${r.title}\nIngredients:\n${r.ingredients.map(i => '- ' + i).join('\n')}\nSteps:\n${r.instructions.map((s, i) => `${i + 1}. ${s}`).join('\n')}${r.totalTimeMin ? `\nTime: ${r.totalTimeMin} min` : ''}${r.servings ? `\nServes: ${r.servings}` : ''}`
}
```

- [ ] **Step 2: Classify intent + gather real data before the model call**

In `POST`, after `message` is validated and `connectDB()`/user fetch done, replace the single `usdaContext` gather block with intent-aware gathering. After the existing `const [weather, usdaContext] = await Promise.all([...])`, add:

```ts
  const intent = mode === 'chat' ? classifyIntent(message) : mode

  let groceryContext: string | null = null
  let webRecipeContext: string | null = null

  if (intent === 'grocery_price') {
    const term = extractPriceTerm(message)
    if (term) {
      const items = await matchIngredients([term])
      groceryContext = formatGrocery(items)
    }
  } else if (intent === 'recipe_web') {
    const recipes = await findWebRecipes(message)
    if (recipes[0]) webRecipeContext = formatWebRecipe(recipes[0])
  } else if (intent === 'cook_from_pantry') {
    const pantry = parsePantryItems(message)
    const recipes = await findWebRecipes(pantry.join(' '))
    if (recipes[0]) {
      webRecipeContext = formatWebRecipe(recipes[0])
      const missing = recipes[0].ingredients.filter(
        ing => !pantry.some(p => ing.toLowerCase().includes(p.toLowerCase())),
      )
      if (missing.length) {
        const items = await matchIngredients(missing)
        groceryContext = formatGrocery(items)
      }
    }
  }
```

- [ ] **Step 3: Pass the new context into buildSystemPrompt**

Change the `buildSystemPrompt` call to:

```ts
  const systemPrompt = buildSystemPrompt(userContext, progress, weather, usdaContext, groceryContext, webRecipeContext)
```

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: clean build.

- [ ] **Step 5: Manual smoke (dev server, authenticated)**

POST to `/api/ai/chat` with each:
- `{ "message": "where can I buy eggs cheapest?" }` → answer cites only real GroceryPrice rows or "not available" + store links.
- `{ "message": "recipe for shakshuka" }` → full recipe inline, **no URLs/site names** (requires Part B env keys; without keys it should say it couldn't find one, not invent).
- `{ "message": "I have eggs, rice, onion at home, what can I cook?" }` → a recipe + a buy-list for missing items with real prices or "not available".
- `{ "message": "how many pushups today?" }` → normal coaching, no grocery/recipe blocks.

- [ ] **Step 6: Commit**

```bash
git add app/api/ai/chat/route.ts
git commit -m "feat(chat): intent-driven real-data injection for 3 modes"
```

---

## Self-Review

- **Spec coverage:** intent classify ✓(T1), 3 modes wired ✓(T3), real-price-only + no-link rules ✓(T2), pantry diff → match missing ✓(T3), ambiguity→clarify (model rule in T2 + classifier fallback to `chat`), store links ✓(T2). All Part C sections covered.
- **Placeholders:** none — full code/regex in each step; manual smoke replaces unit tests for the I/O route per repo convention.
- **Type consistency:** `ChatIntent`, `MatchedIngredient`, `WebRecipe`, `RETAILER_LABELS` imported with the exact names defined in Parts A/B and Task 1. `buildSystemPrompt` 6-arg signature (T2) matches the call site change (T3).
- **Dependency note:** this plan does not compile until Parts A and B are merged (imports from `@/lib/grocery/*` and `@/lib/recipes/*`).
