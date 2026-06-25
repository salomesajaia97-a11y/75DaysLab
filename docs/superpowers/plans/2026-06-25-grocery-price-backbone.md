# Grocery Price Backbone Implementation Plan (Part A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scrape real product prices from three Georgian retailers, match recipe ingredients to those prices via AI translation, and show per-ingredient cheapest-store prices + a basket comparison on the recipe page.

**Architecture:** Mongoose model `GroceryPrice` holds scraped rows. Per-retailer adapters (`lib/grocery/*.ts`) return `ScrapedProduct[]`; an orchestrator upserts them. The daily cron refreshes prices. A matcher translates English ingredient terms to Georgian via OpenRouter, then queries `GroceryPrice`. Two API routes (`match`, `refresh`) and one UI component (`ShopIngredients`) expose it. Prices are **only ever real scraped rows** — the AI never invents a number.

**Tech Stack:** Next.js 16 App Router, Mongoose 9, cheerio, OpenRouter (OpenAI SDK), Tailwind v4, Vitest.

## Global Constraints

- **Real prices only.** Every displayed ₾ is a `GroceryPrice` row with `sourceUrl` + `scrapedAt`. No confident match → "not available". Never a guessed number.
- **No adapter ever throws.** A failing adapter logs and returns `[]`; one retailer down must not break others or the cron.
- **OpenRouter `:free` slugs are dead** (404/429). Use the paid slug already in use: `meta-llama/llama-3.1-8b-instruct`.
- **Auth:** user-facing API routes are gated with `auth()` from `@/lib/auth` (return 401 if no `session.user.id`), matching `app/api/ai/chat/route.ts`.
- **Cron auth:** `authorization === ` + "Bearer ${process.env.CRON_SECRET}", matching `app/api/cron/scrape/route.ts`.
- **Mongoose model guard:** `mongoose.models.X ?? mongoose.model(...)`, matching `models/FoodLog.ts`.
- **No test runner for I/O.** Pure functions get Vitest tests under `lib/**/*.test.ts`. Adapters/routes verified via `npx tsc --noEmit`, `npm run lint`, `npm run build`, and the manual smoke steps in each task.
- **Retailers:** `orinabiji`, `agrohub`, `nikora` only. Carrefour and SPAR are out of scope.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `lib/grocery/types.ts` | `Retailer` union, `ScrapedProduct`, `MatchedIngredient` types |
| `models/GroceryPrice.ts` | Mongoose model + indexes |
| `lib/grocery/orinabiji.ts` | Ori Nabiji JSON adapter (`scrape`, `refreshOne`) |
| `lib/grocery/agrohub.ts` | Agrohub JSON adapter (token harvest + products) |
| `lib/grocery/nikora.ts` | Nikora HTML adapter (cheerio) |
| `lib/grocery/index.ts` | Adapter registry + `scrapeAllRetailers()` |
| `lib/grocery/match.ts` | `stripToFoodTerm`, `translateTerms` (AI), `matchIngredients`, `buildBaskets` |
| `app/api/grocery/match/route.ts` | POST ingredients → priced basket |
| `app/api/grocery/refresh/route.ts` | POST live re-scrape one product |
| `components/recipes/ShopIngredients.tsx` | Recipe-page shop section |
| `app/api/cron/scrape/route.ts` (modify) | Call `scrapeAllRetailers()` after recipes |
| `app/(dashboard)/recipes/[id]/page.tsx` (modify) | Render `<ShopIngredients>` |
| `lib/admin-models.ts` (modify) | Register `groceryprice` read-only |
| `locales/{en,ge}.json` (modify) | `recipes.shop_*` / `grocery.*` keys |

---

### Task 1: Shared types

**Files:**
- Create: `lib/grocery/types.ts`

**Interfaces:**
- Produces: `Retailer`, `ScrapedProduct`, `PriceMatch`, `MatchedIngredient`, `Basket`.

- [ ] **Step 1: Write the types**

```ts
// lib/grocery/types.ts
export type Retailer = 'orinabiji' | 'agrohub' | 'nikora'

export const RETAILERS: Retailer[] = ['orinabiji', 'agrohub', 'nikora']

export const RETAILER_LABELS: Record<Retailer, string> = {
  orinabiji: '2 Nabiji',
  agrohub: 'Agrohub',
  nikora: 'Nikora',
}

/** What an adapter returns for one product. */
export interface ScrapedProduct {
  retailer: Retailer
  productName: string   // as listed (Georgian)
  price: number         // GEL
  unit?: string         // 'kg' | 'ც' | '500g' etc.
  sourceUrl: string
}

/** One retailer's cheapest match for an ingredient. */
export interface PriceMatch {
  retailer: Retailer
  productName: string
  price: number
  unit?: string
  sourceUrl: string
  scrapedAt: string     // ISO
}

/** An ingredient with its per-retailer matches. */
export interface MatchedIngredient {
  ingredient: string    // original e.g. "2 large eggs"
  term: string          // stripped core e.g. "eggs"
  termGe?: string       // Georgian translation used for lookup
  matches: PriceMatch[] // one cheapest row per retailer that carries it
}

/** Basket total for one retailer across all matched ingredients. */
export interface Basket {
  retailer: Retailer
  total: number
  missing: string[]     // terms this retailer has no match for
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `lib/grocery/types.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/grocery/types.ts
git commit -m "feat(grocery): shared types for price intelligence"
```

---

### Task 2: GroceryPrice model

**Files:**
- Create: `models/GroceryPrice.ts`

**Interfaces:**
- Consumes: `Retailer` from `lib/grocery/types.ts`.
- Produces: `GroceryPrice` model, `IGroceryPrice` interface.

- [ ] **Step 1: Write the model**

```ts
// models/GroceryPrice.ts
import mongoose, { Schema, Document } from 'mongoose'
import type { Retailer } from '@/lib/grocery/types'

export interface IGroceryPrice extends Document {
  retailer: Retailer
  productName: string
  productNameEn?: string
  searchText: string     // normalized lowercase Georgian for matching
  price: number
  unit?: string
  sourceUrl: string
  scrapedAt: Date
}

const GroceryPriceSchema = new Schema<IGroceryPrice>({
  retailer: { type: String, enum: ['orinabiji', 'agrohub', 'nikora'], required: true },
  productName: { type: String, required: true },
  productNameEn: String,
  searchText: { type: String, required: true },
  price: { type: Number, required: true },
  unit: String,
  sourceUrl: { type: String, required: true },
  scrapedAt: { type: Date, default: Date.now },
})

GroceryPriceSchema.index({ retailer: 1, searchText: 1 })
GroceryPriceSchema.index({ scrapedAt: 1 })
GroceryPriceSchema.index({ retailer: 1, sourceUrl: 1 }, { unique: true })

export const GroceryPrice =
  mongoose.models.GroceryPrice ?? mongoose.model<IGroceryPrice>('GroceryPrice', GroceryPriceSchema)
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add models/GroceryPrice.ts
git commit -m "feat(grocery): GroceryPrice mongoose model"
```

---

### Task 3: Matcher pure helpers (TDD)

**Files:**
- Create: `lib/grocery/match.ts`
- Test: `lib/grocery/match.test.ts`

**Interfaces:**
- Consumes: `MatchedIngredient`, `Basket`, `Retailer`, `RETAILERS`, `PriceMatch` from types.
- Produces: `stripToFoodTerm(ingredient: string): string`, `buildBaskets(items: MatchedIngredient[]): Basket[]`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/grocery/match.test.ts
import { describe, it, expect } from 'vitest'
import { stripToFoodTerm, buildBaskets } from './match'
import type { MatchedIngredient } from './types'

describe('stripToFoodTerm', () => {
  it('strips leading quantity and unit', () => {
    expect(stripToFoodTerm('2 large eggs')).toBe('eggs')
    expect(stripToFoodTerm('1 cup rice')).toBe('rice')
    expect(stripToFoodTerm('500 g chicken breast')).toBe('chicken breast')
    expect(stripToFoodTerm('¼ tsp salt')).toBe('salt')
  })
  it('strips parentheticals and trailing notes', () => {
    expect(stripToFoodTerm('2 cloves garlic, minced')).toBe('garlic')
    expect(stripToFoodTerm('onion (finely chopped)')).toBe('onion')
  })
  it('returns the term unchanged when no quantity', () => {
    expect(stripToFoodTerm('olive oil')).toBe('olive oil')
  })
})

describe('buildBaskets', () => {
  const items: MatchedIngredient[] = [
    { ingredient: '2 eggs', term: 'eggs', matches: [
      { retailer: 'orinabiji', productName: 'კვერცხი', price: 5, sourceUrl: 'u', scrapedAt: 'd' },
      { retailer: 'agrohub', productName: 'კვერცხი', price: 6, sourceUrl: 'u', scrapedAt: 'd' },
    ]},
    { ingredient: 'rice', term: 'rice', matches: [
      { retailer: 'orinabiji', productName: 'ბრინჯი', price: 4, sourceUrl: 'u', scrapedAt: 'd' },
    ]},
  ]
  it('sums cheapest match per retailer and flags missing', () => {
    const baskets = buildBaskets(items)
    const ori = baskets.find(b => b.retailer === 'orinabiji')!
    const agro = baskets.find(b => b.retailer === 'agrohub')!
    expect(ori.total).toBe(9)        // 5 + 4
    expect(ori.missing).toEqual([])
    expect(agro.total).toBe(6)       // only eggs
    expect(agro.missing).toEqual(['rice'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/grocery/match.test.ts`
Expected: FAIL — `stripToFoodTerm`/`buildBaskets` not exported.

- [ ] **Step 3: Implement the pure helpers**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/grocery/match.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/grocery/match.ts lib/grocery/match.test.ts
git commit -m "feat(grocery): matcher pure helpers (strip term, build baskets)"
```

---

### Task 4: Matcher AI translation + DB lookup

**Files:**
- Modify: `lib/grocery/match.ts`

**Interfaces:**
- Consumes: `openRouterClient`, `GroceryPrice`, helpers from Task 3.
- Produces: `translateTerms(terms: string[]): Promise<Record<string,string>>`, `matchIngredients(ingredients: string[]): Promise<MatchedIngredient[]>`.

- [ ] **Step 1: Add translation + match (real-data-only)**

Append to `lib/grocery/match.ts`:

```ts
function normalizeGe(s: string): string {
  return s.toLowerCase().trim()
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
      for (const retailer of RETAILERS) {
        const row = await GroceryPrice.findOne({
          retailer,
          searchText: { $regex: search.split(/\s+/)[0], $options: 'i' },
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
      }
    }
    out.push({ ingredient: ingredients[i], term, termGe, matches })
  }
  return out
}
```

- [ ] **Step 2: Verify compile + existing tests still pass**

Run: `npx tsc --noEmit && npx vitest run lib/grocery/match.test.ts`
Expected: compiles; Task 3 tests still PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/grocery/match.ts
git commit -m "feat(grocery): AI term translation + GroceryPrice lookup"
```

---

### Task 5: Ori Nabiji adapter

**Files:**
- Create: `lib/grocery/orinabiji.ts`

**Interfaces:**
- Consumes: `ScrapedProduct`.
- Produces: `scrape(): Promise<ScrapedProduct[]>`, `refreshOne(query: string): Promise<ScrapedProduct[]>`.

- [ ] **Step 1: Implement the adapter (never throws)**

```ts
// lib/grocery/orinabiji.ts
import type { ScrapedProduct } from './types'

const BASE = 'https://catalog-api.orinabiji.ge'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function pinWarehouseId(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/api/v1/warehouses`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const data = await res.json()
    const list = Array.isArray(data) ? data : (data?.data ?? data?.warehouses ?? [])
    const id = list?.[0]?.id ?? list?.[0]?.warehouseId
    return id != null ? String(id) : null
  } catch { return null }
}

interface OnProduct { name?: string; title?: string; slug?: string; stock?: { price?: number }; price?: number; unit?: string }

function mapProduct(p: OnProduct): ScrapedProduct | null {
  const price = p.stock?.price ?? p.price
  const productName = (p.name ?? p.title ?? '').trim()
  if (!price || !productName) return null
  return {
    retailer: 'orinabiji',
    productName,
    price: Number(price),
    unit: p.unit,
    sourceUrl: p.slug ? `https://orinabiji.ge/product/${p.slug}` : 'https://orinabiji.ge',
  }
}

async function searchProducts(warehouseId: string, query: string, limit: number): Promise<ScrapedProduct[]> {
  try {
    const res = await fetch(`${BASE}/api/v1/products/search?lang=ge&warehouseId=${warehouseId}&query=${encodeURIComponent(query)}&limit=${limit}`, {
      headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const products: OnProduct[] = data?.data ?? data?.products ?? (Array.isArray(data) ? data : [])
    return products.map(mapProduct).filter((x): x is ScrapedProduct => x !== null)
  } catch { return [] }
}

// staple food terms to seed the daily scrape (Georgian)
const STAPLES = ['კვერცხი', 'ბრინჯი', 'ქათამი', 'ხახვი', 'პომიდორი', 'კარტოფილი', 'ლობио', 'რძე', 'ყველი', 'პური', 'ზეთი', 'შაქარი', 'მარილი', 'მაკარონი', 'ხორცი', 'თევზი', 'სტაფილო', 'წიწაკა', 'ნიორი', 'იოგურტი']

export async function scrape(): Promise<ScrapedProduct[]> {
  const wh = await pinWarehouseId()
  if (!wh) { console.error('[orinabiji] no warehouseId'); return [] }
  const out: ScrapedProduct[] = []
  for (const term of STAPLES) {
    out.push(...await searchProducts(wh, term, 15))
    if (out.length >= 300) break
  }
  return out
}

export async function refreshOne(query: string): Promise<ScrapedProduct[]> {
  const wh = await pinWarehouseId()
  if (!wh) return []
  return searchProducts(wh, query, 10)
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Smoke test the live API**

Create throwaway `scripts/smoke-orinabiji.ts`:

```ts
import { scrape } from '@/lib/grocery/orinabiji'
scrape().then(r => { console.log('count', r.length); console.log(r.slice(0, 3)) })
```

Run: `npx tsx scripts/smoke-orinabiji.ts`
Expected: a count > 0 and rows with real Georgian `productName` + numeric `price`. If the API shape differs, adjust `mapProduct`/`searchProducts` field paths until real rows return, then re-run.
**If the live endpoint is unreachable, log it and continue — adapter returning `[]` is acceptable per Global Constraints; note it in the commit.**

- [ ] **Step 4: Delete the smoke script and commit**

```bash
rm scripts/smoke-orinabiji.ts
git add lib/grocery/orinabiji.ts
git commit -m "feat(grocery): Ori Nabiji price adapter"
```

---

### Task 6: Agrohub adapter

**Files:**
- Create: `lib/grocery/agrohub.ts`

**Interfaces:**
- Produces: `scrape()`, `refreshOne(query)`.

- [ ] **Step 1: Implement the adapter (token harvest + products)**

```ts
// lib/grocery/agrohub.ts
import type { ScrapedProduct } from './types'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function harvestToken(): Promise<string | null> {
  try {
    const res = await fetch('https://agrohub.ge', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) })
    const setCookie = res.headers.get('set-cookie') ?? ''
    const m = setCookie.match(/agrohub-access_token=([^;]+)/)
    return m ? decodeURIComponent(m[1]) : null
  } catch { return null }
}

interface AhProduct { id?: string | number; name?: string; nameGeo?: string; title?: string; price?: number; salePrice?: number; unit?: string; slug?: string }

function mapProduct(p: AhProduct): ScrapedProduct | null {
  const price = p.salePrice ?? p.price
  const productName = (p.nameGeo ?? p.name ?? p.title ?? '').trim()
  if (!price || !productName) return null
  return {
    retailer: 'agrohub',
    productName,
    price: Number(price),
    unit: p.unit,
    sourceUrl: p.slug ? `https://agrohub.ge/product/${p.slug}` : (p.id ? `https://agrohub.ge/product/${p.id}` : 'https://agrohub.ge'),
  }
}

async function fetchPage(token: string, page: number, query?: string): Promise<ScrapedProduct[]> {
  try {
    const q = query ? `&Search=${encodeURIComponent(query)}` : ''
    const res = await fetch(`https://api.agrohub.ge/v1/Products?Page=${page}&Limit=100${q}`, {
      headers: { 'User-Agent': UA, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const products: AhProduct[] = data?.data ?? data?.items ?? data?.products ?? (Array.isArray(data) ? data : [])
    return products.map(mapProduct).filter((x): x is ScrapedProduct => x !== null)
  } catch { return [] }
}

export async function scrape(): Promise<ScrapedProduct[]> {
  const token = await harvestToken()
  if (!token) { console.error('[agrohub] no token'); return [] }
  const out: ScrapedProduct[] = []
  for (let page = 1; page <= 3; page++) {
    const rows = await fetchPage(token, page)
    if (rows.length === 0) break
    out.push(...rows)
    if (out.length >= 300) break
  }
  return out
}

export async function refreshOne(query: string): Promise<ScrapedProduct[]> {
  const token = await harvestToken()
  if (!token) return []
  return fetchPage(token, 1, query)
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Smoke test**

Create `scripts/smoke-agrohub.ts` (same shape as Task 5 but importing agrohub), run `npx tsx scripts/smoke-agrohub.ts`, confirm real rows or graceful `[]`. Adjust field paths (`data`/`items`, `nameGeo`, `salePrice`) to the live shape. Delete the script.

- [ ] **Step 4: Commit**

```bash
git add lib/grocery/agrohub.ts
git commit -m "feat(grocery): Agrohub price adapter"
```

---

### Task 7: Nikora adapter

**Files:**
- Create: `lib/grocery/nikora.ts`

**Interfaces:**
- Produces: `scrape()`, `refreshOne(query)`.

- [ ] **Step 1: Implement the cheerio adapter**

```ts
// lib/grocery/nikora.ts
import * as cheerio from 'cheerio'
import type { ScrapedProduct } from './types'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const ROOT = 'https://nikorasupermarket.ge'

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(12000) })
    if (!res.ok) return null
    return await res.text()
  } catch { return null }
}

/** Parse split lari/tetri spans into a number. Nikora renders e.g. <span>3</span><span>.49</span>. */
function parsePrice($el: cheerio.Cheerio<never>, $: cheerio.CheerioAPI): number | undefined {
  const text = $el.text().replace(/[^\d.,]/g, '').replace(',', '.')
  const n = parseFloat(text)
  return isNaN(n) ? undefined : n
}

function parsePage(html: string): ScrapedProduct[] {
  const $ = cheerio.load(html)
  const out: ScrapedProduct[] = []
  $('.product, .product-card, [class*="product-item"]').each((_, el) => {
    const $el = $(el)
    const productName = $el.find('.product-title, .title, [class*="name"]').first().text().trim()
    const price = parsePrice($el.find('.price, [class*="price"]').first() as never, $)
    const href = $el.find('a').first().attr('href')
    if (!productName || !price) return
    out.push({
      retailer: 'nikora',
      productName,
      price,
      sourceUrl: href ? (href.startsWith('http') ? href : `${ROOT}${href}`) : ROOT,
    })
  })
  return out
}

const CATALOG_PAGES = [
  `${ROOT}/category/rdzis-produqtebi`,
  `${ROOT}/category/khorci-tevzi`,
  `${ROOT}/category/baqaleya`,
  `${ROOT}/category/khili-bostneuli`,
]

export async function scrape(): Promise<ScrapedProduct[]> {
  const out: ScrapedProduct[] = []
  for (const url of CATALOG_PAGES) {
    const html = await fetchHtml(url)
    if (!html) continue
    out.push(...parsePage(html))
    if (out.length >= 300) break
  }
  if (out.length === 0) console.error('[nikora] no products parsed — selectors may have changed')
  return out
}

export async function refreshOne(query: string): Promise<ScrapedProduct[]> {
  const html = await fetchHtml(`${ROOT}/search?q=${encodeURIComponent(query)}`)
  if (!html) return []
  return parsePage(html)
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no new errors. (If cheerio's `Cheerio<never>` typing complains, change the `parsePrice` signature to accept `string` and pass `$el...text()`.)

- [ ] **Step 3: Smoke test + selector tuning**

Create `scripts/smoke-nikora.ts`, run it, inspect output. Nikora's real DOM class names must be confirmed live — open one category URL, view source, and adjust the selectors in `parsePage`/`CATALOG_PAGES` until real rows parse. Delete the script.
**If the site structure can't be parsed, leave the adapter returning `[]` (logged) and note it in the commit — the other two retailers still work.**

- [ ] **Step 4: Commit**

```bash
git add lib/grocery/nikora.ts
git commit -m "feat(grocery): Nikora price adapter"
```

---

### Task 8: Orchestrator + upsert

**Files:**
- Create: `lib/grocery/index.ts`

**Interfaces:**
- Consumes: the three adapters, `GroceryPrice`, `ScrapedProduct`.
- Produces: `scrapeAllRetailers(): Promise<{ retailer: Retailer; count: number }[]>`, `REFRESH_ADAPTERS` registry.

- [ ] **Step 1: Implement orchestrator**

```ts
// lib/grocery/index.ts
import { GroceryPrice } from '@/models/GroceryPrice'
import * as orinabiji from './orinabiji'
import * as agrohub from './agrohub'
import * as nikora from './nikora'
import type { Retailer, ScrapedProduct } from './types'

const ADAPTERS: Record<Retailer, { scrape: () => Promise<ScrapedProduct[]>; refreshOne: (q: string) => Promise<ScrapedProduct[]> }> = {
  orinabiji, agrohub, nikora,
}

export const REFRESH_ADAPTERS = ADAPTERS

async function upsert(products: ScrapedProduct[]): Promise<void> {
  for (const p of products) {
    await GroceryPrice.updateOne(
      { retailer: p.retailer, sourceUrl: p.sourceUrl },
      { $set: {
        productName: p.productName,
        searchText: p.productName.toLowerCase().trim(),
        price: p.price,
        unit: p.unit,
        scrapedAt: new Date(),
      } },
      { upsert: true },
    )
  }
}

export async function scrapeAllRetailers(): Promise<{ retailer: Retailer; count: number }[]> {
  const entries = Object.entries(ADAPTERS) as [Retailer, typeof orinabiji][]
  const settled = await Promise.allSettled(entries.map(async ([retailer, adapter]) => {
    const products = await adapter.scrape()
    await upsert(products)
    return { retailer, count: products.length }
  }))
  return settled.map((s, i) => s.status === 'fulfilled' ? s.value : { retailer: entries[i][0], count: 0 })
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/grocery/index.ts
git commit -m "feat(grocery): scrapeAllRetailers orchestrator + upsert"
```

---

### Task 9: Match + refresh API routes

**Files:**
- Create: `app/api/grocery/match/route.ts`
- Create: `app/api/grocery/refresh/route.ts`

**Interfaces:**
- Consumes: `matchIngredients`, `buildBaskets`, `REFRESH_ADAPTERS`, `GroceryPrice`, `auth`, `connectDB`.

- [ ] **Step 1: match route**

```ts
// app/api/grocery/match/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { matchIngredients, buildBaskets } from '@/lib/grocery/match'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { ingredients?: string[] }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const ingredients = (body.ingredients ?? []).filter(s => typeof s === 'string' && s.trim()).slice(0, 30)
  if (ingredients.length === 0) return NextResponse.json({ error: 'ingredients required' }, { status: 400 })

  await connectDB()
  const items = await matchIngredients(ingredients)
  const baskets = buildBaskets(items)
  return NextResponse.json({ items, baskets })
}
```

- [ ] **Step 2: refresh route**

```ts
// app/api/grocery/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { GroceryPrice } from '@/models/GroceryPrice'
import { REFRESH_ADAPTERS } from '@/lib/grocery'
import type { Retailer } from '@/lib/grocery/types'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { retailer?: Retailer; term?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { retailer, term } = body
  if (!retailer || !REFRESH_ADAPTERS[retailer] || !term?.trim()) {
    return NextResponse.json({ error: 'retailer + term required' }, { status: 400 })
  }

  await connectDB()
  const products = await REFRESH_ADAPTERS[retailer].refreshOne(term.trim())
  for (const p of products) {
    await GroceryPrice.updateOne(
      { retailer: p.retailer, sourceUrl: p.sourceUrl },
      { $set: { productName: p.productName, searchText: p.productName.toLowerCase().trim(), price: p.price, unit: p.unit, scrapedAt: new Date() } },
      { upsert: true },
    )
  }
  const cheapest = products.sort((a, b) => a.price - b.price)[0] ?? null
  return NextResponse.json({ refreshed: products.length, cheapest })
}
```

- [ ] **Step 3: Verify compile + build**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/grocery/match/route.ts app/api/grocery/refresh/route.ts
git commit -m "feat(grocery): match + live refresh API routes"
```

---

### Task 10: ShopIngredients UI

**Files:**
- Create: `components/recipes/ShopIngredients.tsx`
- Modify: `app/(dashboard)/recipes/[id]/page.tsx`

**Interfaces:**
- Consumes: `/api/grocery/match`, `/api/grocery/refresh`, `MatchedIngredient`, `Basket`, `RETAILER_LABELS`, `useLanguage`.

- [ ] **Step 1: Read the recipe detail page to match its conventions**

Run: open `app/(dashboard)/recipes/[id]/page.tsx`. Note how `recipe.ingredients` is rendered and the CSS-var/Fraunces styling, so the new section matches.

- [ ] **Step 2: Implement the component**

```tsx
// components/recipes/ShopIngredients.tsx
'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n'
import { RETAILER_LABELS } from '@/lib/grocery/types'
import type { MatchedIngredient, Basket } from '@/lib/grocery/types'

function hoursAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000))
}

export function ShopIngredients({ ingredients }: { ingredients: string[] }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<MatchedIngredient[] | null>(null)
  const [baskets, setBaskets] = useState<Basket[]>([])
  const [failed, setFailed] = useState(false)

  async function loadPrices() {
    setLoading(true); setFailed(false)
    try {
      const res = await fetch('/api/grocery/match', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients }),
      })
      if (!res.ok) throw new Error('match failed')
      const data = await res.json()
      setItems(data.items); setBaskets(data.baskets)
    } catch { setFailed(true) } finally { setLoading(false) }
  }

  const cheapest = baskets.filter(b => b.total > 0).sort((a, b) => a.total - b.total)[0]

  return (
    <section className="mt-8">
      <h2 className="text-xl mb-3" style={{ fontFamily: 'var(--font-fraunces)' }}>{t('recipes.shop_title')}</h2>

      {!items && (
        <button onClick={loadPrices} disabled={loading}
          className="rounded-lg px-4 py-2 text-sm active:scale-95 transition"
          style={{ background: 'var(--primary)', color: 'var(--primary-foreground, #fff)' }}>
          {loading ? t('recipes.shop_loading') : t('recipes.shop_cta')}
        </button>
      )}

      {failed && <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{t('recipes.shop_unavailable')}</p>}

      {items && (
        <>
          {cheapest && (
            <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <p className="text-sm mb-2" style={{ color: 'var(--muted-foreground)' }}>{t('recipes.shop_basket')}</p>
              <div className="flex flex-wrap gap-3">
                {baskets.map(b => (
                  <span key={b.retailer} className="text-sm"
                    style={{ fontWeight: b.retailer === cheapest.retailer ? 700 : 400 }}>
                    {RETAILER_LABELS[b.retailer]} {b.total > 0 ? `₾${b.total.toFixed(2)}` : '—'}
                    {b.missing.length > 0 && b.total > 0 ? ` (−${b.missing.length})` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
          <ul className="space-y-2">
            {items.map((it, i) => {
              const m = it.matches.slice().sort((a, b) => a.price - b.price)[0]
              return (
                <li key={i} className="flex justify-between text-sm border-b py-2" style={{ borderColor: 'var(--border)' }}>
                  <span>{it.term}</span>
                  {m ? (
                    <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-right">
                      {RETAILER_LABELS[m.retailer]} · ₾{m.price.toFixed(2)}
                      <span style={{ color: 'var(--muted-foreground)' }}> · {t('recipes.shop_updated', { h: String(hoursAgo(m.scrapedAt)) })}</span>
                    </a>
                  ) : (
                    <span style={{ color: 'var(--muted-foreground)' }}>{t('recipes.shop_na')}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
```

- [ ] **Step 3: Render it on the recipe page**

In `app/(dashboard)/recipes/[id]/page.tsx`, import and render below the ingredients list:

```tsx
import { ShopIngredients } from '@/components/recipes/ShopIngredients'
// ...after the ingredients <ul>:
{recipe.ingredients?.length ? <ShopIngredients ingredients={recipe.ingredients} /> : null}
```

- [ ] **Step 4: Add i18n keys**

Add to `locales/en.json` (and Georgian equivalents to `locales/ge.json`):

```json
"recipes.shop_title": "Shop ingredients",
"recipes.shop_cta": "Find cheapest prices",
"recipes.shop_loading": "Finding prices…",
"recipes.shop_basket": "Basket total per store",
"recipes.shop_updated": "updated {h}h ago",
"recipes.shop_na": "not available",
"recipes.shop_unavailable": "Prices unavailable right now."
```

ge.json values (translate): `"recipes.shop_title": "ინგრედიენტების ყიდვა"`, `"recipes.shop_cta": "იპოვე იაფი ფასები"`, `"recipes.shop_loading": "ფასების ძებნა…"`, `"recipes.shop_basket": "კალათის ჯამი მაღაზიების მიხედვით"`, `"recipes.shop_updated": "განახლდა {h}სთ წინ"`, `"recipes.shop_na": "არ არის ხელმისაწვდომი"`, `"recipes.shop_unavailable": "ფასები ამჟამად მიუწვდომელია."`

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: clean build.

- [ ] **Step 6: Commit**

```bash
git add components/recipes/ShopIngredients.tsx "app/(dashboard)/recipes/[id]/page.tsx" locales/en.json locales/ge.json
git commit -m "feat(grocery): ShopIngredients UI on recipe page + i18n"
```

---

### Task 11: Cron integration + admin model

**Files:**
- Modify: `app/api/cron/scrape/route.ts`
- Modify: `lib/admin-models.ts`

- [ ] **Step 1: Extend the cron handler**

In `app/api/cron/scrape/route.ts`, after the recipe loop and before the final `return`, wrap grocery in try/catch so it can never abort recipe scraping:

```ts
import { scrapeAllRetailers } from '@/lib/grocery'
// ...
let grocery: { retailer: string; count: number }[] = []
try {
  grocery = await scrapeAllRetailers()
} catch (err) {
  console.error('[cron] grocery scrape failed', err instanceof Error ? err.message : String(err))
}
return NextResponse.json({ ok: true, ...results, grocery })
```

- [ ] **Step 2: Register admin model**

Open `lib/admin-models.ts`, find how `foodlog` is registered as read-only, and add `groceryprice` the same way (reusing the existing registration shape — match the exact structure already present in that file).

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/scrape/route.ts lib/admin-models.ts
git commit -m "feat(grocery): cron refresh + admin model registration"
```

---

## Self-Review

- **Spec coverage:** GroceryPrice model ✓(T2), 3 adapters ✓(T5-7), orchestrator ✓(T8), matcher ✓(T3-4), match+refresh routes ✓(T9), ShopIngredients ✓(T10), cron + admin ✓(T11), i18n ✓(T10). All price-spec sections covered.
- **Placeholders:** none — every code step has real code; adapter field-paths are best-effort against documented APIs with smoke steps to tune live.
- **Type consistency:** `ScrapedProduct`/`MatchedIngredient`/`Basket`/`PriceMatch`/`Retailer` defined in T1, used identically in T3-T10. `matchIngredients`/`buildBaskets`/`scrapeAllRetailers`/`REFRESH_ADAPTERS` names consistent across tasks.
- **Known risk:** the three live-API shapes (T5-7) are documented, not verified; each task has a smoke step to correct field paths, and the never-throw constraint means a wrong shape degrades to "not available" rather than breaking the build.
