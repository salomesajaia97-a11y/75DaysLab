# Recipe Philosophy Engine — Design

**Date:** 2026-06-24
**Status:** Approved (brainstorming)

## Goal

Extend the existing recipe engine with two new source sites and a "philosophy-driven"
filter layer modeled on three authoritative platforms:

1. **Minimalist Baker** (`minimalistbaker.com`) — simplicity: ≤10 ingredients, one bowl/pot, ≤30 min.
2. **EatingWell** (`eatingwell.com`) — nutritional accuracy: full macros + goal-oriented categories. *(Already integrated.)*
3. **Love and Lemons** (`loveandlemons.com`) — vibrant, plant-forward, whole-food.

The philosophy is surfaced as three **lens tabs** in the UI, each expanding into its own filter pills.

## Context (existing system)

- `models/Recipe.ts` — Mongoose model. `sourceSite` enum currently: `seriouseats | skinnytaste | allrecipes | eatingwell | kulinaria | spruceeats`. Macro fields (`protein/carbs/fat`) already exist.
- `lib/scrapers.ts` — TS scraper. Extracts schema.org JSON-LD `Recipe` (`scrapeRecipePage`), plus per-site URL collectors. Used by API routes.
- `scripts/recipe_scraper.py` — standalone Python multi-site scraper. `SITES` registry + `recipe_from_ld`. POSTs to `/api/external/recipes`.
- `app/api/external/recipes/route.ts` — auth'd ingest POST. Dedups on `sourceUrl`, then `Recipe.create`.
- `app/api/recipes/route.ts` — GET with filters `site`, `category`, `maxCal`, `minCal`, `limit`.
- `app/api/recipes/scrape/route.ts` — admin-triggered in-process scrape by site.
- `app/(dashboard)/recipes/page.tsx` — client page. Loads all recipes, groups by site, calorie-only filter pills (`200cal/300cal/400cal/protein`). Admin scrape buttons.

**Key facts:** EatingWell is already wired (no work). Minimalist Baker and Love and Lemons are WordPress/Yoast sites exposing `sitemap_index.xml` and JSON-LD `Recipe` markup, so the existing `recipe_from_ld` / `scrapeRecipePage` parse their pages unchanged — only URL collectors are missing.

## Decisions

| Decision | Choice |
|---|---|
| Scope | Full engine (new sites + philosophy filters) |
| Classification | Deterministic-first (no AI) |
| UI | Philosophy lenses + filters |

## 1. Data model — `models/Recipe.ts`

- `sourceSite` enum + interface union gains `'minimalistbaker'`, `'loveandlemons'`.
- New stored fields (computed at ingest, indexed for query):
  - `ingredientCount?: number`
  - `isOnePot?: boolean`
  - `dietTags: string[]` (default `[]`) — values from a fixed vocabulary: `vegan`, `vegetarian`, `gluten-free`, `dairy-free`, `plant-forward`, `whole-food`.
- Add indexes: `{ ingredientCount: 1 }`, `{ isOnePot: 1 }`, `{ dietTags: 1 }`, `{ totalTimeMin: 1 }` (compound not required initially).
- Time and macro goals reuse existing numeric fields (`totalTimeMin`, `calories`, `protein`, `carbs`, `fat`) — **no new fields** for those.

## 2. Classification — `lib/classify.ts` (new)

Pure, deterministic, dependency-free functions. Operate on the scraped/posted recipe shape.

```ts
export interface ClassifyInput {
  title?: string
  category?: string
  tags?: string[]
  ingredients?: string[]
  suitableForDiet?: string[]   // schema.org RestrictedDiet IRIs/strings
}
export interface DerivedAttrs {
  ingredientCount?: number
  isOnePot: boolean
  dietTags: string[]
}
export function classifyRecipe(input: ClassifyInput): DerivedAttrs
```

- `ingredientCount` = `ingredients?.length` (raw array length; salt/water NOT excluded — YAGNI).
- `isOnePot` = case-insensitive regex over `title + category + tags.join(' ')`:
  `/(one[- ]?pot|one[- ]?bowl|one[- ]?pan|sheet[- ]?pan|skillet|dump(\s|-)?(dinner|meal)?|5[- ]?ingredient)/i`
- `dietTags`:
  - From `suitableForDiet`: map schema IRIs (`VeganDiet`→`vegan`, `VegetarianDiet`→`vegetarian`, `GlutenFreeDiet`→`gluten-free`, etc.).
  - From keyword match over `title + category + tags`: `vegan`, `vegetarian`/`veggie`, `gluten[- ]free`, `dairy[- ]free`, `whole[- ]food`/`whole food`, `plant[- ]based`→`plant-forward`.
  - Derived rule: if `vegan` or `vegetarian` present, add `plant-forward`.
  - Dedup, return sorted stable vocabulary subset.

### Wiring (single chokepoint)

- Call `classifyRecipe` in **`/api/external/recipes` POST** and **`/api/recipes/scrape`** immediately before `Recipe.create`, merging `DerivedAttrs` into the document. Works regardless of whether the source is Python or in-process TS.
- Both scrapers (`lib/scrapers.ts` + `recipe_scraper.py`) extract `suitableForDiet` (schema.org `suitableForDiet`, may be string or array) and pass it through. The field is consumed by classify and is NOT persisted as its own column.

### Backfill

- `POST /api/recipes/reclassify` (admin/secret-guarded): iterate all recipes, recompute `ingredientCount`/`isOnePot`/`dietTags` from their stored fields, bulk-update. One-shot to populate existing rows. Returns count updated.

## 3. Scrapers — new sites

### Python (`scripts/recipe_scraper.py`)
- `get_urls_minimalistbaker()` — fetch `https://minimalistbaker.com/sitemap_index.xml` → post sub-sitemaps → collect recipe-post URLs (filter out category/tag/page/author/feed paths). Recipe posts are top-level slugs.
- `get_urls_loveandlemons()` — fetch `https://www.loveandlemons.com/sitemap_index.xml` → post sub-sitemaps → collect recipe URLs (same SKIP filtering).
- `parse_minimalistbaker(url)` / `parse_loveandlemons(url)` — both: `fetch` → `extract_json_ld` → `recipe_from_ld(ld, url, site)`. Add `suitableForDiet` capture inside `recipe_from_ld`.
- Register both in `SITES`.

### TS (`lib/scrapers.ts`)
- Add `'minimalistbaker' | 'loveandlemons'` to the `sourceSite` unions in `ScrapedRecipe` and `scrapeRecipePage`.
- Add `getRecipeUrlsMinimalistBaker(limit)` and `getRecipeUrlsLoveAndLemons(limit)` (sitemap_index walk, mirrors `getRecipeUrlsAllRecipes`).
- Extract `suitableForDiet` in `scrapeRecipePage`, add to `ScrapedRecipe`.

### Scrape route (`app/api/recipes/scrape/route.ts`)
- Add both sites to the site→collector map so admin buttons / cron can trigger them.

## 4. UI — philosophy lenses (`app/(dashboard)/recipes/page.tsx`)

- Update `Recipe` interface + `SITE_LABELS` (`minimalistbaker: 'Minimalist Baker'`, `loveandlemons: 'Love & Lemons'`), add `ingredientCount`, `isOnePot`, `dietTags`.
- Replace flat `FILTERS` with a two-level structure:

```
Lens:  [ All ]  [ Minimal ]  [ Goal ]  [ Plant-Forward ]
Pills (depend on lens):
  Minimal        → ≤10 ingredients · one-pot · ≤30 min
  Goal           → high-protein · low-carb · ≤400 cal
  Plant-Forward  → vegan · vegetarian · whole-food
```

- Pills are multi-select within a lens; "All" = no filters.
- Active lens + pills compose query params and refetch from the API (server-side filtering, scales with DB growth) rather than the current load-all-then-filter-client-side.

### API extension (`app/api/recipes/route.ts`)
Add query params (all optional, combined with existing AND filter):
- `maxIngredients` → `ingredientCount: { $lte }`
- `onePot=true` → `isOnePot: true`
- `diet=vegan,vegetarian` (csv) → `dietTags: { $in: [...] }`
- `minProtein` → `protein: { $gte }`
- `maxCarbs` → `carbs: { $lte }`
- `maxTime` → `totalTimeMin: { $lte }`

Pill → param mapping:
| Pill | Param |
|---|---|
| ≤10 ingredients | `maxIngredients=10` |
| one-pot | `onePot=true` |
| ≤30 min | `maxTime=30` |
| high-protein | `minProtein=20` |
| low-carb | `maxCarbs=20` |
| ≤400 cal | `maxCal=400` |
| vegan | `diet=vegan` |
| vegetarian | `diet=vegetarian` |
| whole-food | `diet=whole-food` |

(Numeric thresholds: high-protein ≥20 g, low-carb ≤20 g — fixed constants, tunable later.)

## Out of scope (YAGNI)

- AI / LLM classification.
- Faceted sidebar / sliders.
- "Smart" ingredient counting (excluding salt/water/optional).
- Favorites persistence, recipe authoring, i18n of new pill labels beyond reusing existing key patterns (added as needed).

## Testing

- `lib/classify.ts` — unit tests: ingredient count, one-pot keyword hits/misses, diet tag mapping from both `suitableForDiet` and keywords, plant-forward derivation.
- API GET filter params — assert query object construction for each new param.
- Reclassify endpoint — recomputes and persists on a seeded set.
- Scraper URL collectors — smoke test that sitemap parsing returns recipe URLs (network-gated; can be skipped in CI).

## Component boundaries

- `lib/classify.ts` — pure logic, no I/O, independently testable.
- Scrapers — fetch + parse, depend on classify only indirectly (classify runs at ingest, not in scraper).
- API routes — translate query params ↔ Mongo filter; depend on model + classify.
- UI page — lens/pill state → query string; depends only on the GET contract.
