# Recipe Philosophy Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Minimalist Baker + Love and Lemons as recipe sources and a philosophy-driven filter layer (Minimal / Goal / Plant-Forward lenses) backed by deterministic ingest-time classification.

**Architecture:** A pure `lib/classify.ts` module derives `ingredientCount`, `isOnePot`, and `dietTags` from scraped recipe data. It runs server-side at every ingest chokepoint (external POST + in-process scrape) so source-of-origin doesn't matter. The model stores these denormalized+indexed fields; the GET API filters on them via new query params; the UI exposes them as lens tabs → filter pills that compose those params.

**Tech Stack:** Next.js 16 (App Router), Mongoose 9, TypeScript 5, Vitest (new, unit tests for pure logic), Python (standalone scraper).

## Global Constraints

- Next.js 16 — before touching framework APIs, read the relevant guide in `node_modules/next/dist/docs/` (per AGENTS.md).
- Work directly on `main` and push; NO feature branches.
- OpenRouter `:free` model slugs are dead — N/A here (no AI in this feature).
- `dietTags` fixed vocabulary: `vegan`, `vegetarian`, `gluten-free`, `dairy-free`, `plant-forward`, `whole-food`.
- `sourceSite` new values: `minimalistbaker`, `loveandlemons`.
- Numeric filter constants: high-protein `protein >= 20`, low-carb `carbs <= 20`, quick `totalTimeMin <= 30`, minimal-ingredients `ingredientCount <= 10`, low-cal `calories <= 400`.

---

## File Structure

- `lib/classify.ts` — **create**. Pure deterministic classifier. No I/O.
- `lib/classify.test.ts` — **create**. Vitest unit tests.
- `vitest.config.ts` — **create**. Minimal config (node env, includes `lib/**/*.test.ts`).
- `package.json` — **modify**. Add `vitest` devDep + `test` script.
- `models/Recipe.ts` — **modify**. Enum + fields + indexes.
- `lib/scrapers.ts` — **modify**. Site unions, `suitableForDiet` extraction, two URL collectors.
- `scripts/recipe_scraper.py` — **modify**. `suitableForDiet` in `recipe_from_ld`, two sites, registry.
- `app/api/external/recipes/route.ts` — **modify**. Run classify before create.
- `app/api/recipes/scrape/route.ts` — **modify**. New sites + run classify before create.
- `app/api/recipes/reclassify/route.ts` — **create**. Admin backfill.
- `app/api/recipes/route.ts` — **modify**. New GET filter params.
- `app/(dashboard)/recipes/page.tsx` — **modify**. Lens tabs + pills + query-driven fetch.

---

### Task 1: Pure classifier `lib/classify.ts` + Vitest

**Files:**
- Create: `lib/classify.ts`
- Create: `lib/classify.test.ts`
- Create: `vitest.config.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface ClassifyInput { title?: string; category?: string; tags?: string[]; ingredients?: string[]; suitableForDiet?: string | string[] }`
  - `interface DerivedAttrs { ingredientCount?: number; isOnePot: boolean; dietTags: string[] }`
  - `function classifyRecipe(input: ClassifyInput): DerivedAttrs`

- [ ] **Step 1: Add Vitest dependency and script**

Edit `package.json` — add to `scripts`:
```json
    "test": "vitest run",
    "test:watch": "vitest"
```
Then install:
```bash
npm install -D vitest@^3
```
Expected: `vitest` appears in `devDependencies`, lockfile updates.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Write the failing tests** — `lib/classify.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { classifyRecipe } from './classify'

describe('classifyRecipe', () => {
  it('counts ingredients from the array length', () => {
    expect(classifyRecipe({ ingredients: ['a', 'b', 'c'] }).ingredientCount).toBe(3)
  })

  it('leaves ingredientCount undefined when no ingredients', () => {
    expect(classifyRecipe({}).ingredientCount).toBeUndefined()
  })

  it('detects one-pot from title keywords', () => {
    expect(classifyRecipe({ title: 'One Pot Creamy Pasta' }).isOnePot).toBe(true)
    expect(classifyRecipe({ title: 'Sheet Pan Salmon' }).isOnePot).toBe(true)
    expect(classifyRecipe({ tags: ['one-bowl', 'easy'] }).isOnePot).toBe(true)
  })

  it('does not flag one-pot for unrelated recipes', () => {
    expect(classifyRecipe({ title: 'Layered Lasagna', tags: ['baked'] }).isOnePot).toBe(false)
  })

  it('maps schema.org suitableForDiet IRIs to diet tags', () => {
    const r = classifyRecipe({ suitableForDiet: 'https://schema.org/VeganDiet' })
    expect(r.dietTags).toContain('vegan')
    expect(r.dietTags).toContain('plant-forward')
  })

  it('extracts diet tags from keywords and dedups', () => {
    const r = classifyRecipe({ title: 'Vegan Gluten-Free Brownies', tags: ['dairy free', 'whole food'] })
    expect(r.dietTags).toEqual(expect.arrayContaining(['vegan', 'gluten-free', 'dairy-free', 'whole-food', 'plant-forward']))
    expect(new Set(r.dietTags).size).toBe(r.dietTags.length)
  })

  it('adds plant-forward when vegetarian present', () => {
    expect(classifyRecipe({ tags: ['vegetarian'] }).dietTags).toContain('plant-forward')
  })

  it('returns empty dietTags for an omnivore recipe', () => {
    expect(classifyRecipe({ title: 'Grilled Chicken', tags: ['dinner'] }).dietTags).toEqual([])
  })
})
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `classify` module / `classifyRecipe` not found.

- [ ] **Step 5: Implement `lib/classify.ts`**

```ts
export interface ClassifyInput {
  title?: string
  category?: string
  tags?: string[]
  ingredients?: string[]
  suitableForDiet?: string | string[]
}

export interface DerivedAttrs {
  ingredientCount?: number
  isOnePot: boolean
  dietTags: string[]
}

const ONE_POT_RE = /one[- ]?(pot|bowl|pan)|sheet[- ]?pan|skillet|dump[- ]?(dinner|meal)?|\bone[- ]?dish\b/i

// schema.org RestrictedDiet IRI/name → our tag
const DIET_IRI_MAP: Record<string, string> = {
  vegandiet: 'vegan',
  vegetariandiet: 'vegetarian',
  glutenfreediet: 'gluten-free',
  diabeticdiet: '',
  lowfatdiet: '',
  lowcaloriediet: '',
  lowsaltdiet: '',
  lowlactosediet: 'dairy-free',
  halaldiet: '',
  kosherdiet: '',
}

// keyword (tested against title+category+tags) → tag
const DIET_KEYWORDS: { re: RegExp; tag: string }[] = [
  { re: /\bvegan\b/i, tag: 'vegan' },
  { re: /\bvegetarian\b|\bveggie\b/i, tag: 'vegetarian' },
  { re: /gluten[- ]?free/i, tag: 'gluten-free' },
  { re: /dairy[- ]?free/i, tag: 'dairy-free' },
  { re: /whole[- ]?food/i, tag: 'whole-food' },
  { re: /plant[- ]?based/i, tag: 'plant-forward' },
]

const VOCAB = ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'plant-forward', 'whole-food']

export function classifyRecipe(input: ClassifyInput): DerivedAttrs {
  const tags = input.tags ?? []
  const haystack = [input.title ?? '', input.category ?? '', ...tags].join(' ')

  const ingredientCount = input.ingredients?.length

  const isOnePot = ONE_POT_RE.test(haystack)

  const found = new Set<string>()

  // From schema.org suitableForDiet
  const diets = Array.isArray(input.suitableForDiet)
    ? input.suitableForDiet
    : input.suitableForDiet
    ? [input.suitableForDiet]
    : []
  for (const d of diets) {
    const key = String(d).toLowerCase().replace(/[^a-z]/g, '').replace(/^https?schemaorg/, '')
    const mapped = DIET_IRI_MAP[key]
    if (mapped) found.add(mapped)
  }

  // From keywords
  for (const { re, tag } of DIET_KEYWORDS) {
    if (re.test(haystack)) found.add(tag)
  }

  // Derived: vegan/vegetarian implies plant-forward
  if (found.has('vegan') || found.has('vegetarian')) found.add('plant-forward')

  const dietTags = VOCAB.filter(t => found.has(t))

  return { ingredientCount, isOnePot, dietTags }
}
```

Note on the IRI key transform: `https://schema.org/VeganDiet` → strip non-letters → `httpsschemaorgvegandiet` → strip leading `httpsschemaorg` → `vegandiet`. Bare `VeganDiet` → `vegandiet`. Both hit the map.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all 8 tests green.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/classify.ts lib/classify.test.ts
git commit -m "feat(recipes): deterministic recipe classifier + vitest"
```

---

### Task 2: Model — new sites, derived fields, indexes

**Files:**
- Modify: `models/Recipe.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `IRecipe` gains `ingredientCount?: number`, `isOnePot?: boolean`, `dietTags: string[]`; `sourceSite` union/enum gains `minimalistbaker`, `loveandlemons`.

- [ ] **Step 1: Update interface and schema**

In `models/Recipe.ts`, change the `sourceSite` type in `IRecipe` to:
```ts
  sourceSite: 'seriouseats' | 'skinnytaste' | 'allrecipes' | 'eatingwell' | 'kulinaria' | 'spruceeats' | 'minimalistbaker' | 'loveandlemons'
```
Add these fields to `IRecipe` (after `tags: string[]`):
```ts
  ingredientCount?: number
  isOnePot?: boolean
  dietTags: string[]
```
In `RecipeSchema`, update the enum:
```ts
  sourceSite:   { type: String, enum: ['seriouseats', 'skinnytaste', 'allrecipes', 'eatingwell', 'kulinaria', 'spruceeats', 'minimalistbaker', 'loveandlemons'], required: true },
```
Add fields (after `tags`):
```ts
  ingredientCount: Number,
  isOnePot:        { type: Boolean, default: false },
  dietTags:        { type: [String], default: [] },
```

- [ ] **Step 2: Add indexes**

After the schema definition (before the `export const Recipe` line), add:
```ts
RecipeSchema.index({ ingredientCount: 1 })
RecipeSchema.index({ isOnePot: 1 })
RecipeSchema.index({ dietTags: 1 })
RecipeSchema.index({ totalTimeMin: 1 })
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors from `models/Recipe.ts`.

- [ ] **Step 4: Commit**

```bash
git add models/Recipe.ts
git commit -m "feat(recipes): add sites + derived classification fields to model"
```

---

### Task 3: Run classifier at ingest + reclassify backfill

**Files:**
- Modify: `app/api/external/recipes/route.ts`
- Modify: `app/api/recipes/scrape/route.ts`
- Create: `app/api/recipes/reclassify/route.ts`

**Interfaces:**
- Consumes: `classifyRecipe` from `@/lib/classify`.
- Produces: ingest writes now persist `ingredientCount`/`isOnePot`/`dietTags`; `POST /api/recipes/reclassify` (Bearer `SCRAPER_SECRET`) backfills existing rows, returns `{ ok, updated }`.

- [ ] **Step 1: Classify in external ingest route**

In `app/api/external/recipes/route.ts`, add import at top:
```ts
import { classifyRecipe } from '@/lib/classify'
```
Replace the create line:
```ts
  await Recipe.create({ ...body, scrapedAt: new Date() })
```
with:
```ts
  const derived = classifyRecipe(body)
  await Recipe.create({ ...body, ...derived, scrapedAt: new Date() })
```

- [ ] **Step 2: Classify in scrape route**

In `app/api/recipes/scrape/route.ts`, add import:
```ts
import { classifyRecipe } from '@/lib/classify'
```
Replace the create call:
```ts
      await Recipe.create({ ...scraped, scrapedAt: new Date() })
```
with:
```ts
      const derived = classifyRecipe(scraped)
      await Recipe.create({ ...scraped, ...derived, scrapedAt: new Date() })
```

- [ ] **Step 3: Create reclassify backfill route**

Create `app/api/recipes/reclassify/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { Recipe } from '@/models/Recipe'
import { classifyRecipe } from '@/lib/classify'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.SCRAPER_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const cursor = Recipe.find({}, 'title category tags ingredients').lean().cursor()
  let updated = 0
  for await (const r of cursor) {
    const derived = classifyRecipe(r as Record<string, unknown>)
    await Recipe.updateOne({ _id: r._id }, { $set: derived })
    updated++
  }

  return NextResponse.json({ ok: true, updated })
}
```
(Note: `suitableForDiet` is not stored on existing rows, so backfill derives diet tags from title/category/tags only — acceptable; fresh scrapes get the schema signal too.)

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors in the three files.

- [ ] **Step 5: Commit**

```bash
git add app/api/external/recipes/route.ts app/api/recipes/scrape/route.ts app/api/recipes/reclassify/route.ts
git commit -m "feat(recipes): classify at ingest + reclassify backfill endpoint"
```

---

### Task 4: GET `/api/recipes` — new filter params

**Files:**
- Modify: `app/api/recipes/route.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: GET accepts `maxIngredients`, `onePot`, `diet` (csv), `minProtein`, `maxCarbs`, `maxTime` in addition to existing `site`, `category`, `maxCal`, `minCal`, `limit`.

- [ ] **Step 1: Parse and apply new params**

In `app/api/recipes/route.ts`, after the existing `minCal` block (the `if (maxCal || minCal)` block), insert:
```ts
  const maxIngredients = searchParams.get('maxIngredients')
  if (maxIngredients) filter.ingredientCount = { $lte: parseInt(maxIngredients) }

  if (searchParams.get('onePot') === 'true') filter.isOnePot = true

  const diet = searchParams.get('diet')
  if (diet) filter.dietTags = { $in: diet.split(',').map(d => d.trim()).filter(Boolean) }

  const minProtein = searchParams.get('minProtein')
  if (minProtein) filter.protein = { $gte: parseInt(minProtein) }

  const maxCarbs = searchParams.get('maxCarbs')
  if (maxCarbs) filter.carbs = { $lte: parseInt(maxCarbs) }

  const maxTime = searchParams.get('maxTime')
  if (maxTime) filter.totalTimeMin = { $lte: parseInt(maxTime) }
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Manual smoke test (after dev server running)**

Run dev server, then:
```bash
curl "http://localhost:3000/api/recipes?onePot=true&maxIngredients=10&limit=5"
curl "http://localhost:3000/api/recipes?diet=vegan,vegetarian&limit=5"
curl "http://localhost:3000/api/recipes?minProtein=20&maxTime=30&limit=5"
```
Expected: each returns `{ recipes: [...], total: N }` with 200 status (may be empty until backfill/new scrape runs).

- [ ] **Step 4: Commit**

```bash
git add app/api/recipes/route.ts
git commit -m "feat(recipes): philosophy filter params on GET endpoint"
```

---

### Task 5: TS scraper — site unions, suitableForDiet, URL collectors

**Files:**
- Modify: `lib/scrapers.ts`
- Modify: `app/api/recipes/scrape/route.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `ScrapedRecipe` gains `dietTags?` is NOT added (classify handles it); instead `suitableForDiet?: string | string[]`.
  - `getRecipeUrlsMinimalistBaker(limit?: number): Promise<string[]>`
  - `getRecipeUrlsLoveAndLemons(limit?: number): Promise<string[]>`
  - `scrapeRecipePage` accepts the two new site strings.

- [ ] **Step 1: Extend site unions + ScrapedRecipe**

In `lib/scrapers.ts`, change both `sourceSite` unions (in `ScrapedRecipe` interface and the `scrapeRecipePage` `site` param) to include `| 'minimalistbaker' | 'loveandlemons'`.
Add to `ScrapedRecipe` interface (after `tags: string[]`):
```ts
  suitableForDiet?: string | string[]
```

- [ ] **Step 2: Extract suitableForDiet in scrapeRecipePage**

In `scrapeRecipePage`, before the `return {` statement, add:
```ts
  const suitableForDiet = ld['suitableForDiet'] as string | string[] | undefined
```
Add `suitableForDiet,` to the returned object literal.

- [ ] **Step 3: Add a generic sitemap-index URL collector**

At the end of `lib/scrapers.ts` (before `export function delay`), add a shared helper plus the two site collectors:
```ts
/** Walk a WordPress/Yoast sitemap_index.xml and collect recipe-post URLs. */
async function collectFromSitemapIndex(
  indexUrl: string,
  host: string,
  skip: RegExp,
  limit: number,
): Promise<string[]> {
  try {
    const idxRes = await fetch(indexUrl, { headers: { 'User-Agent': HEADERS['User-Agent'] }, signal: AbortSignal.timeout(10000) })
    if (!idxRes.ok) return []
    const idxXml = await idxRes.text()

    const subSitemaps: string[] = []
    for (const m of idxXml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const u = m[1].trim()
      if (/post.*sitemap|sitemap.*post/i.test(u)) subSitemaps.push(u)
    }
    // Fallback: if no post-sitemaps matched, use any sub-sitemap referencing the host
    if (subSitemaps.length === 0) {
      for (const m of idxXml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
        const u = m[1].trim()
        if (u.includes('sitemap') && u.includes(host)) subSitemaps.push(u)
      }
    }

    const urls: string[] = []
    for (const sm of subSitemaps) {
      if (urls.length >= limit) break
      try {
        const res = await fetch(sm, { headers: { 'User-Agent': HEADERS['User-Agent'] }, signal: AbortSignal.timeout(10000) })
        if (!res.ok) continue
        const xml = await res.text()
        for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
          const u = m[1].trim()
          if (u.includes(host) && !skip.test(u)) urls.push(u.replace(/\/$/, ''))
          if (urls.length >= limit) break
        }
      } catch { /* skip bad sub-sitemap */ }
    }
    return urls
  } catch {
    return []
  }
}

const MB_SKIP = /\/(category|tag|author|page|about|contact|shop|recipe-index|wprm_print|feed)\b|\?|#/i
export function getRecipeUrlsMinimalistBaker(limit = 15): Promise<string[]> {
  return collectFromSitemapIndex('https://minimalistbaker.com/sitemap_index.xml', 'minimalistbaker.com', MB_SKIP, limit)
}

const LL_SKIP = /\/(category|tag|author|page|about|contact|shop|recipes|wprm_print|feed)\b|\?|#/i
export function getRecipeUrlsLoveAndLemons(limit = 15): Promise<string[]> {
  return collectFromSitemapIndex('https://www.loveandlemons.com/sitemap_index.xml', 'loveandlemons.com', LL_SKIP, limit)
}
```

- [ ] **Step 4: Wire new sites into scrape route**

In `app/api/recipes/scrape/route.ts`:
Update the import to add the collectors:
```ts
import { scrapeRecipePage, getRecipeUrlsSkinnyTaste, getRecipeUrlsAllRecipes, getRecipeUrlsMinimalistBaker, getRecipeUrlsLoveAndLemons, delay } from '@/lib/scrapers'
```
Change the target type:
```ts
type ScrapeTarget = 'skinnytaste' | 'allrecipes' | 'minimalistbaker' | 'loveandlemons'
```
Replace the site-selection line:
```ts
  const site: ScrapeTarget = body.site === 'allrecipes' ? 'allrecipes' : 'skinnytaste'
```
with:
```ts
  const allowed: ScrapeTarget[] = ['skinnytaste', 'allrecipes', 'minimalistbaker', 'loveandlemons']
  const site: ScrapeTarget = allowed.includes(body.site) ? body.site : 'skinnytaste'
```
Replace the URL-collection `if/else` block:
```ts
  if (site === 'allrecipes') {
    const urls = await getRecipeUrlsAllRecipes(batchSize * 2)
    candidateUrls.push(...urls)
  } else {
    for (const sm of ST_SITEMAPS) {
      const urls = await getRecipeUrlsSkinnyTaste(sm, perSitemap)
      candidateUrls.push(...urls)
    }
  }
```
with:
```ts
  if (site === 'allrecipes') {
    candidateUrls.push(...await getRecipeUrlsAllRecipes(batchSize * 2))
  } else if (site === 'minimalistbaker') {
    candidateUrls.push(...await getRecipeUrlsMinimalistBaker(batchSize * 2))
  } else if (site === 'loveandlemons') {
    candidateUrls.push(...await getRecipeUrlsLoveAndLemons(batchSize * 2))
  } else {
    for (const sm of ST_SITEMAPS) {
      candidateUrls.push(...await getRecipeUrlsSkinnyTaste(sm, perSitemap))
    }
  }
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/scrapers.ts app/api/recipes/scrape/route.ts
git commit -m "feat(recipes): Minimalist Baker + Love and Lemons TS scrapers"
```

---

### Task 6: Python scraper — new sites + suitableForDiet

**Files:**
- Modify: `scripts/recipe_scraper.py`

**Interfaces:**
- Consumes: existing `recipe_from_ld`, `all_sub_sitemaps`, `fetch_sitemaps_parallel`, `extract_json_ld`, `ordered_dedup`.
- Produces: `SITES` registry includes `minimalistbaker` and `loveandlemons`; each recipe dict carries `suitableForDiet`.

- [ ] **Step 1: Capture suitableForDiet in recipe_from_ld**

In `recipe_from_ld`, add before the `return {` dict:
```python
    suitable = ld.get("suitableForDiet")
```
Add to the returned dict (after `"instructions": instructions,`):
```python
        "suitableForDiet": suitable,
```

- [ ] **Step 2: Add Minimalist Baker collector + parser**

After the spruceeats section (before `# ─── SITE REGISTRY`), add:
```python
# ─── SITE 6: minimalistbaker.com ──────────────────────────────────────────────
def get_urls_minimalistbaker() -> list:
    urls = []
    sub_maps = [u for u in all_sub_sitemaps("https://minimalistbaker.com/sitemap_index.xml")
                if "post" in u.lower()]
    if not sub_maps:
        sub_maps = all_sub_sitemaps("https://minimalistbaker.com/sitemap_index.xml")
    log.info(f"minimalistbaker: {len(sub_maps)} sub-sitemaps")
    SKIP = {"category", "tag", "author", "about", "contact", "shop", "recipe-index", "feed"}
    for _url, soup in fetch_sitemaps_parallel(sub_maps):
        for loc in soup.find_all("loc"):
            u = loc.get_text(strip=True)
            if "minimalistbaker.com" in u and not any(sk in u for sk in SKIP):
                urls.append(u.rstrip("/"))
    log.info(f"minimalistbaker: {len(urls)} candidates")
    return ordered_dedup(urls)

def parse_minimalistbaker(url: str) -> Optional[dict]:
    soup = fetch(url)
    if not soup:
        return None
    ld = extract_json_ld(soup)
    return recipe_from_ld(ld, url, "minimalistbaker") if ld else None
```

- [ ] **Step 3: Add Love and Lemons collector + parser**

Immediately after the Minimalist Baker section, add:
```python
# ─── SITE 7: loveandlemons.com ────────────────────────────────────────────────
def get_urls_loveandlemons() -> list:
    urls = []
    sub_maps = [u for u in all_sub_sitemaps("https://www.loveandlemons.com/sitemap_index.xml")
                if "post" in u.lower()]
    if not sub_maps:
        sub_maps = all_sub_sitemaps("https://www.loveandlemons.com/sitemap_index.xml")
    log.info(f"loveandlemons: {len(sub_maps)} sub-sitemaps")
    SKIP = {"category", "tag", "author", "about", "contact", "shop", "recipes", "feed"}
    for _url, soup in fetch_sitemaps_parallel(sub_maps):
        for loc in soup.find_all("loc"):
            u = loc.get_text(strip=True)
            if "loveandlemons.com" in u and not any(sk in u for sk in SKIP):
                urls.append(u.rstrip("/"))
    log.info(f"loveandlemons: {len(urls)} candidates")
    return ordered_dedup(urls)

def parse_loveandlemons(url: str) -> Optional[dict]:
    soup = fetch(url)
    if not soup:
        return None
    ld = extract_json_ld(soup)
    return recipe_from_ld(ld, url, "loveandlemons") if ld else None
```

- [ ] **Step 4: Register both sites**

In the `SITES` list, add two entries:
```python
    {"name": "minimalistbaker", "get_urls": get_urls_minimalistbaker, "parse": parse_minimalistbaker},
    {"name": "loveandlemons",   "get_urls": get_urls_loveandlemons,   "parse": parse_loveandlemons},
```

- [ ] **Step 5: Syntax-check the script**

Run: `python -m py_compile scripts/recipe_scraper.py`
Expected: exit 0, no output.

- [ ] **Step 6: Commit**

```bash
git add scripts/recipe_scraper.py
git commit -m "feat(recipes): Minimalist Baker + Love and Lemons Python scrapers"
```

---

### Task 7: UI — philosophy lens tabs + filter pills

**Files:**
- Modify: `app/(dashboard)/recipes/page.tsx`

**Interfaces:**
- Consumes: GET `/api/recipes` filter params from Task 4.
- Produces: lens/pill UI; query-driven fetch.

- [ ] **Step 1: Extend the Recipe interface + SITE_LABELS**

In the `Recipe` interface, add to the `sourceSite` union `| 'minimalistbaker' | 'loveandlemons'`, and add fields:
```ts
  ingredientCount?: number
  isOnePot?: boolean
  dietTags?: string[]
```
In `SITE_LABELS`, add:
```ts
  minimalistbaker: 'Minimalist Baker',
  loveandlemons:   'Love & Lemons',
```

- [ ] **Step 2: Replace the filter model with lenses + pills**

Remove the old `FilterKey`, `FILTERS`, and `passesFilter` declarations (lines ~31-49). Replace with:
```ts
type PillKey =
  | 'maxIngr10' | 'onePot' | 'quick'        // Minimal
  | 'highProtein' | 'lowCarb' | 'lowCal'    // Goal
  | 'vegan' | 'vegetarian' | 'wholeFood'    // Plant-Forward

type LensKey = 'all' | 'minimal' | 'goal' | 'plant'

const LENSES: { key: LensKey; labelKey: string; fallback: string; pills: PillKey[] }[] = [
  { key: 'all',     labelKey: 'recipes.lens.all',     fallback: 'All',           pills: [] },
  { key: 'minimal', labelKey: 'recipes.lens.minimal', fallback: 'Minimal',       pills: ['maxIngr10', 'onePot', 'quick'] },
  { key: 'goal',    labelKey: 'recipes.lens.goal',    fallback: 'Goal',          pills: ['highProtein', 'lowCarb', 'lowCal'] },
  { key: 'plant',   labelKey: 'recipes.lens.plant',   fallback: 'Plant-Forward', pills: ['vegan', 'vegetarian', 'wholeFood'] },
]

const PILL_LABELS: Record<PillKey, string> = {
  maxIngr10: '≤10 ingredients', onePot: 'One-pot', quick: '≤30 min',
  highProtein: 'High-protein', lowCarb: 'Low-carb', lowCal: '≤400 cal',
  vegan: 'Vegan', vegetarian: 'Vegetarian', wholeFood: 'Whole-food',
}

// Maps an active pill to GET query params
const PILL_PARAMS: Record<PillKey, [string, string]> = {
  maxIngr10:   ['maxIngredients', '10'],
  onePot:      ['onePot', 'true'],
  quick:       ['maxTime', '30'],
  highProtein: ['minProtein', '20'],
  lowCarb:     ['maxCarbs', '20'],
  lowCal:      ['maxCal', '400'],
  vegan:       ['diet', 'vegan'],
  vegetarian:  ['diet', 'vegetarian'],
  wholeFood:   ['diet', 'whole-food'],
}

function buildQuery(pills: Set<PillKey>): string {
  const params = new URLSearchParams()
  const diets: string[] = []
  for (const p of pills) {
    const [k, v] = PILL_PARAMS[p]
    if (k === 'diet') diets.push(v)
    else params.set(k, v)
  }
  if (diets.length) params.set('diet', diets.join(','))
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}
```

- [ ] **Step 3: Replace filter state and fetch logic**

Replace the `const [filter, setFilter] = useState<FilterKey>('all')` line with:
```ts
  const [lens, setLens] = useState<LensKey>('all')
  const [pills, setPills] = useState<Set<PillKey>>(new Set())
```
Replace the initial-load `useEffect` (the `fetch('/api/recipes')` one) with a query-driven fetch that re-runs when pills change:
```ts
  useEffect(() => {
    setLoading(true)
    fetch(`/api/recipes${buildQuery(pills)}`)
      .then(r => r.ok ? r.json() : { recipes: [] })
      .then(data => setRecipes(data.recipes ?? []))
      .catch(() => setRecipes([]))
      .finally(() => setLoading(false))
  }, [pills])
```
In the 60s auto-refresh `useEffect`, change the fetch URL to `` `/api/recipes${buildQuery(pills)}` `` and add `pills` to its dependency array.

- [ ] **Step 4: Remove client-side filtering**

Replace:
```ts
  const filtered = recipes.filter(r => passesFilter(r, filter))
  const groups = groupBySite(filtered)
```
with:
```ts
  const groups = groupBySite(recipes)
```

- [ ] **Step 5: Add the lens + pill toggle handlers**

Before the `return (`, add:
```ts
  function selectLens(key: LensKey) {
    setLens(key)
    setPills(new Set())   // reset pills when switching lens
  }
  function togglePill(p: PillKey) {
    setPills(prev => {
      const next = new Set(prev)
      next.has(p) ? next.delete(p) : next.add(p)
      return next
    })
  }
  const activeLens = LENSES.find(l => l.key === lens)!
```

- [ ] **Step 6: Replace the filter-pills JSX**

Replace the entire `{recipes.length > 0 && ( ... FILTERS.map ... )}` block with:
```tsx
      {/* Lens tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {LENSES.map(l => (
          <button
            key={l.key}
            onClick={() => selectLens(l.key)}
            className={cn('flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all', lens === l.key ? 'text-white shadow-sm' : 'border')}
            style={lens === l.key ? { background: 'var(--primary)' } : { borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
          >
            {t(l.labelKey) === l.labelKey ? l.fallback : t(l.labelKey)}
          </button>
        ))}
      </div>

      {/* Pills for the active lens */}
      {activeLens.pills.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {activeLens.pills.map(p => (
            <button
              key={p}
              onClick={() => togglePill(p)}
              className={cn('flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all', pills.has(p) ? 'text-white' : 'border')}
              style={pills.has(p) ? { background: 'var(--primary)' } : { borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
            >
              {PILL_LABELS[p]}
            </button>
          ))}
        </div>
      )}
```

- [ ] **Step 7: Verify it compiles + lints**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: no errors, no unused-var warnings for removed `filter`/`FILTERS`/`passesFilter`.

- [ ] **Step 8: Commit**

```bash
git add "app/(dashboard)/recipes/page.tsx"
git commit -m "feat(recipes): philosophy lens tabs + filter pills UI"
```

---

### Task 8: i18n keys + final verification

**Files:**
- Modify: `locales/en.json`
- Modify: `locales/ge.json`

**Interfaces:**
- Consumes: lens label keys referenced in Task 7.
- Produces: `recipes.lens.*` keys in both locales.

- [ ] **Step 1: Add lens keys to both locales**

Locate the `recipes` object in `locales/en.json` and add (merge into existing nested structure — match the file's key style, e.g. `"recipes.lens.all"` flat or nested under `recipes`):
```json
"recipes.lens.all": "All",
"recipes.lens.minimal": "Minimal",
"recipes.lens.goal": "Goal",
"recipes.lens.plant": "Plant-Forward"
```
Add to `locales/ge.json`:
```json
"recipes.lens.all": "ყველა",
"recipes.lens.minimal": "მინიმალისტური",
"recipes.lens.goal": "მიზნობრივი",
"recipes.lens.plant": "მცენარეული"
```
(First inspect one existing `recipes.*` key in each file to match flat-vs-nested convention; the Task 7 fallback strings mean the UI still works if a key is missing.)

- [ ] **Step 2: Full build + test gate**

Run:
```bash
npm test
npx tsc --noEmit -p tsconfig.json
npm run lint
npm run build
```
Expected: tests pass, no type errors, no lint errors, build succeeds.

- [ ] **Step 3: Live verification (dev server)**

Start dev server. In the app:
1. Go to `/recipes`. Confirm lens tabs render (All / Minimal / Goal / Plant-Forward).
2. As admin, trigger a Minimalist Baker scrape (or run `python scripts/recipe_scraper.py` once). Confirm new recipes appear grouped under "Minimalist Baker" / "Love & Lemons".
3. Click **Minimal → ≤10 ingredients**; confirm the grid refetches and narrows.
4. `POST /api/recipes/reclassify` with the `SCRAPER_SECRET` bearer; confirm `{ ok, updated: N }` and that older recipes now respond to filters.

- [ ] **Step 4: Commit + push**

```bash
git add locales/en.json locales/ge.json
git commit -m "feat(recipes): i18n keys for philosophy lenses"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- §1 model fields/sites → Task 2 ✅
- §2 classify module + wiring + reclassify → Tasks 1, 3 ✅
- §3 scrapers (TS + Python) + suitableForDiet → Tasks 5, 6 ✅
- §4 lenses + API params → Tasks 4, 7 ✅
- Out-of-scope items respected (no AI, no sidebar, raw ingredient count) ✅
- Testing § engine (classify unit tests) → Task 1 ✅; API/scraper/UI verified via typecheck+build+manual (no test infra for I/O) — documented deviation.

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✅

**Type consistency:** `classifyRecipe`/`ClassifyInput`/`DerivedAttrs` consistent across Tasks 1/3; `getRecipeUrlsMinimalistBaker`/`getRecipeUrlsLoveAndLemons` consistent Tasks 5; `dietTags` vocabulary + `PILL_PARAMS` values match Task 4 param names. ✅

**Deviation note:** TDD red-green cycle applied fully to the pure classifier (Task 1). I/O-bound tasks (Mongo routes, network scrapers, React page) use compile + build + manual smoke verification instead of unit tests, because the repo has no test harness for those layers and adding Mongo/Next/React mocking infra is out of scope for this feature.
