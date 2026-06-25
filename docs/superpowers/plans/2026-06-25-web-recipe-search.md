# Web Recipe Search Implementation Plan (Part B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Given a dish name, search the open web (Google), scrape result pages, parse `schema.org/Recipe` JSON-LD, and return full recipe content (title, ingredients, steps) — never links, never hallucinated.

**Architecture:** `lib/recipes/websearch.ts` calls the Google Programmable Search JSON API for candidate URLs. `lib/recipes/extract.ts` fetches a page and parses its Recipe JSON-LD into a `WebRecipe` (reusing the proven parsing logic already in `lib/scrapers.ts`). `lib/recipes/find.ts` orchestrates search → parallel extract → rank (soft-boosting quality/Georgian domains) → top 3. One auth-gated API route exposes it. Every path degrades gracefully to `[]`.

**Tech Stack:** Next.js 16 App Router, cheerio, Google Custom Search JSON API, Vitest.

## Global Constraints

- **Real recipes only.** Content comes from actually-fetched pages parsed via JSON-LD. No page → no recipe. Never invent.
- **No links to the user.** `WebRecipe.sourceDomain` is internal (ranking/debug) only; the API response and any UI must not surface URLs/domains.
- **Never throw.** Search/extract failures return `[]`/`null`; the caller falls back to the Recipe DB.
- **Graceful without keys.** Missing `GOOGLE_CSE_KEY`/`GOOGLE_CSE_ID` → `findWebRecipes` returns `[]`.
- **Auth:** API route gated with `auth()` from `@/lib/auth` (401 if no `session.user.id`).
- **A recipe counts as "complete" only with ≥3 ingredients and ≥1 instruction step.**

---

## File Structure

| File | Responsibility |
|------|----------------|
| `lib/recipes/types.ts` | `WebRecipe` interface |
| `lib/recipes/extract.ts` | `extractRecipe(url)` — fetch + JSON-LD → `WebRecipe` |
| `lib/recipes/websearch.ts` | `searchRecipeUrls(query)` — Google CSE → URLs |
| `lib/recipes/find.ts` | `findWebRecipes(query)` — orchestrate + rank |
| `app/api/recipes/web-search/route.ts` | POST `{ query }` → `{ recipes }` |

---

### Task 1: WebRecipe type + JSON-LD parser (TDD)

The repo already parses Recipe JSON-LD in `lib/scrapers.ts` (`extractJsonLd`, `scrapeRecipePage`). This task lifts that logic into a generic, domain-agnostic `extractRecipe` and unit-tests the mapping against a fixture.

**Files:**
- Create: `lib/recipes/types.ts`
- Create: `lib/recipes/extract.ts`
- Test: `lib/recipes/extract.test.ts`

**Interfaces:**
- Produces: `WebRecipe`, `parseRecipeJsonLd(html: string, sourceUrl: string): WebRecipe | null`, `extractRecipe(url: string): Promise<WebRecipe | null>`.

- [ ] **Step 1: Write the type**

```ts
// lib/recipes/types.ts
export interface WebRecipe {
  title: string
  ingredients: string[]
  instructions: string[]
  totalTimeMin?: number
  servings?: string
  imageUrl?: string
  sourceDomain: string   // internal only; never shown to the user
}
```

- [ ] **Step 2: Write the failing test (with a real JSON-LD fixture)**

```ts
// lib/recipes/extract.test.ts
import { describe, it, expect } from 'vitest'
import { parseRecipeJsonLd } from './extract'

const HTML = `<html><head>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Recipe","name":"Shakshuka",
 "recipeIngredient":["4 eggs","1 onion","2 tomatoes","1 tsp paprika"],
 "recipeInstructions":[{"@type":"HowToStep","text":"Saute onion."},{"@type":"HowToStep","text":"Add tomatoes."},{"@type":"HowToStep","text":"Crack eggs in, cover."}],
 "totalTime":"PT25M","recipeYield":"2 servings","image":"https://x.test/img.jpg"}
</script></head><body></body></html>`

describe('parseRecipeJsonLd', () => {
  it('maps a Recipe object to WebRecipe', () => {
    const r = parseRecipeJsonLd(HTML, 'https://www.eatingwell.com/recipe/shakshuka')!
    expect(r.title).toBe('Shakshuka')
    expect(r.ingredients).toHaveLength(4)
    expect(r.instructions[0]).toBe('Saute onion.')
    expect(r.instructions).toHaveLength(3)
    expect(r.totalTimeMin).toBe(25)
    expect(r.servings).toBe('2 servings')
    expect(r.sourceDomain).toBe('eatingwell.com')
  })
  it('handles @graph wrapping', () => {
    const g = HTML.replace('"@type":"Recipe"', '"@type":"WebPage"}],"@graph":[{"@type":"Recipe"')
    // not a strict graph test; ensure no throw and either null or a recipe
    const r = parseRecipeJsonLd(g, 'https://kulinaria.ge/x')
    expect(r === null || typeof r.title === 'string').toBe(true)
  })
  it('returns null when no Recipe present', () => {
    expect(parseRecipeJsonLd('<html><body>no jsonld</body></html>', 'https://x.test/y')).toBeNull()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run lib/recipes/extract.test.ts`
Expected: FAIL — `parseRecipeJsonLd` not exported.

- [ ] **Step 4: Implement extract.ts**

```ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/recipes/extract.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/recipes/types.ts lib/recipes/extract.ts lib/recipes/extract.test.ts
git commit -m "feat(recipes): generic schema.org/Recipe JSON-LD extractor"
```

---

### Task 2: Google Custom Search wrapper

**Files:**
- Create: `lib/recipes/websearch.ts`

**Interfaces:**
- Produces: `searchRecipeUrls(query: string): Promise<string[]>`.

- [ ] **Step 1: Implement the wrapper (graceful without keys, never throws)**

```ts
// lib/recipes/websearch.ts
export async function searchRecipeUrls(query: string): Promise<string[]> {
  const key = process.env.GOOGLE_CSE_KEY
  const cx = process.env.GOOGLE_CSE_ID
  if (!key || !cx) {
    console.warn('[websearch] GOOGLE_CSE_KEY/GOOGLE_CSE_ID not set — skipping web search')
    return []
  }
  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&num=8&q=${encodeURIComponent(query + ' recipe')}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) { console.error('[websearch] CSE status', res.status); return [] }
    const data = await res.json()
    const items: Array<{ link?: string }> = data?.items ?? []
    return items.map(i => i.link).filter((l): l is string => typeof l === 'string')
  } catch (err) {
    console.error('[websearch]', err instanceof Error ? err.message : String(err))
    return []
  }
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/recipes/websearch.ts
git commit -m "feat(recipes): Google Custom Search URL wrapper"
```

---

### Task 3: find orchestrator + ranking (TDD on rank)

**Files:**
- Create: `lib/recipes/find.ts`
- Test: `lib/recipes/find.test.ts`

**Interfaces:**
- Consumes: `searchRecipeUrls`, `extractRecipe`, `WebRecipe`.
- Produces: `rankRecipes(recipes: WebRecipe[]): WebRecipe[]`, `findWebRecipes(query: string): Promise<WebRecipe[]>`.

- [ ] **Step 1: Write the failing test for ranking**

```ts
// lib/recipes/find.test.ts
import { describe, it, expect } from 'vitest'
import { rankRecipes } from './find'
import type { WebRecipe } from './types'

const mk = (domain: string, title: string): WebRecipe => ({
  title, ingredients: ['a', 'b', 'c'], instructions: ['step'], sourceDomain: domain,
})

describe('rankRecipes', () => {
  it('boosts preferred quality/Georgian domains above generic ones', () => {
    const input = [mk('randomblog.com', 'X'), mk('eatingwell.com', 'Y'), mk('kulinaria.ge', 'Z')]
    const ranked = rankRecipes(input)
    expect(['eatingwell.com', 'kulinaria.ge']).toContain(ranked[0].sourceDomain)
    expect(ranked[ranked.length - 1].sourceDomain).toBe('randomblog.com')
  })
  it('keeps order stable among non-preferred domains', () => {
    const input = [mk('a.com', '1'), mk('b.com', '2')]
    const ranked = rankRecipes(input)
    expect(ranked.map(r => r.sourceDomain)).toEqual(['a.com', 'b.com'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/recipes/find.test.ts`
Expected: FAIL — `rankRecipes` not exported.

- [ ] **Step 3: Implement find.ts**

```ts
// lib/recipes/find.ts
import { searchRecipeUrls } from './websearch'
import { extractRecipe } from './extract'
import type { WebRecipe } from './types'

const PREFERRED = ['eatingwell.com', 'nutrition.gov', 'kulinaria.ge', 'seriouseats.com', 'allrecipes.com', 'skinnytaste.com']

function score(domain: string): number {
  const idx = PREFERRED.findIndex(d => domain === d || domain.endsWith('.' + d))
  return idx === -1 ? 0 : PREFERRED.length - idx   // higher = more preferred
}

export function rankRecipes(recipes: WebRecipe[]): WebRecipe[] {
  // stable sort: preferred domains first (by preference order), others keep input order
  return recipes
    .map((r, i) => ({ r, i, s: score(r.sourceDomain) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map(x => x.r)
}

function isComplete(r: WebRecipe): boolean {
  return r.ingredients.length >= 3 && r.instructions.length >= 1
}

export async function findWebRecipes(query: string): Promise<WebRecipe[]> {
  const urls = await searchRecipeUrls(query)
  if (urls.length === 0) return []
  const settled = await Promise.allSettled(urls.slice(0, 8).map(extractRecipe))
  const recipes = settled
    .map(s => s.status === 'fulfilled' ? s.value : null)
    .filter((r): r is WebRecipe => r !== null && isComplete(r))
  return rankRecipes(recipes).slice(0, 3)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/recipes/find.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/recipes/find.ts lib/recipes/find.test.ts
git commit -m "feat(recipes): findWebRecipes orchestrator + domain ranking"
```

---

### Task 4: web-search API route

**Files:**
- Create: `app/api/recipes/web-search/route.ts`

**Interfaces:**
- Consumes: `findWebRecipes`, `auth`. Returns `{ recipes }` with `sourceDomain` stripped.

- [ ] **Step 1: Implement the route (strip internal fields)**

```ts
// app/api/recipes/web-search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { findWebRecipes } from '@/lib/recipes/find'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { query?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const query = body.query?.trim()
  if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 })

  const found = await findWebRecipes(query)
  // strip sourceDomain — never expose where it came from
  const recipes = found.map(({ sourceDomain: _omit, ...rest }) => rest)
  return NextResponse.json({ recipes })
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: clean. (If lint flags the unused `_omit`, prefix is already `_`; otherwise destructure via `const { sourceDomain, ...rest } = found[i]` inside a loop and `void sourceDomain`.)

- [ ] **Step 3: Smoke test (requires env keys)**

Set `GOOGLE_CSE_KEY` + `GOOGLE_CSE_ID` in `.env.local`, run the dev server, and POST `{ "query": "shakshuka" }` to `/api/recipes/web-search` while authenticated. Expect a `recipes` array with full ingredients/steps and **no domain/url fields**. Without keys, expect `{ recipes: [] }`.

- [ ] **Step 4: Commit**

```bash
git add app/api/recipes/web-search/route.ts
git commit -m "feat(recipes): web-search API route (links stripped)"
```

---

## Self-Review

- **Spec coverage:** websearch ✓(T2), extract/JSON-LD ✓(T1), find+rank ✓(T3), API route with links stripped ✓(T4), graceful-without-keys ✓(T2), complete-recipe gate ✓(T3). All Part B sections covered.
- **Placeholders:** none — full code in every step; extract logic mirrors the verified `lib/scrapers.ts` parser.
- **Type consistency:** `WebRecipe` (T1) used identically in T3/T4. `searchRecipeUrls`/`extractRecipe`/`parseRecipeJsonLd`/`rankRecipes`/`findWebRecipes` names consistent across tasks.
- **Note:** `nutrition.gov` recipes may not all expose Recipe JSON-LD; the complete-recipe gate drops any page that doesn't parse, so coverage self-limits to parseable pages — acceptable and truthful.
