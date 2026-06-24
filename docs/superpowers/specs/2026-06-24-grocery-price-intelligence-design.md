# Georgian Grocery Price Intelligence — Design Spec

**Date:** 2026-06-24
**Status:** Approved
**Sibling spec:** `2026-06-24-nutrition-ux-upgrade-design.md` (Spec A, shipped)

---

## Overview

Advise users where to buy a recipe's ingredients cheapest across major Georgian grocery retailers. Recipes are scraped from English-language sites (SkinnyTaste/AllRecipes) so ingredients are in English; Georgian retailers list products in Georgian. An AI matching layer bridges the two. Prices come **only** from real scraped data — the AI never invents a price.

**Launch retailers** (scrapeability verified live):
- **Ori Nabiji** — JSON API `catalog-api.orinabiji.ge` (no auth; needs a `warehouseId`)
- **Agrohub** — JSON API `api.agrohub.ge/v1/Products` (anonymous Bearer token harvested from homepage cookie)
- **Nikora** — server-rendered HTML at `nikorasupermarket.ge` (cheerio; promo/seasonal catalog)

Deferred: **Carrefour** (Akamai bot protection). Dropped: **SPAR** (no live store).

---

## Truth & Freshness (core principles)

- **Truth:** The AI only translates/matches ingredient names. Every displayed price is a real `GroceryPrice` row with a `sourceUrl` and `scrapedAt`. If no confident match exists → render "not available", never a guessed number. Each price links to its retailer source so the user can verify.
- **Freshness:** Prices are refreshed by the daily cron. Each price shows an "updated Xh ago" badge. A per-ingredient **live refresh** button re-scrapes that single product on demand and updates the cache.

---

## Architecture

### New files
| File | Purpose |
|------|---------|
| `models/GroceryPrice.ts` | Mongoose model for a scraped product price |
| `lib/grocery/types.ts` | Shared `ScrapedProduct` type + `Retailer` union |
| `lib/grocery/orinabiji.ts` | Ori Nabiji JSON adapter |
| `lib/grocery/agrohub.ts` | Agrohub JSON adapter (token harvest + products) |
| `lib/grocery/nikora.ts` | Nikora HTML adapter (cheerio) |
| `lib/grocery/index.ts` | Adapter registry + `scrapeAllRetailers()` orchestrator |
| `lib/grocery/match.ts` | AI ingredient→product matcher (translate + match) |
| `app/api/grocery/match/route.ts` | POST: match a recipe's ingredients → priced basket |
| `app/api/grocery/refresh/route.ts` | POST: live re-scrape one product (per-item refresh) |
| `components/recipes/ShopIngredients.tsx` | "Shop ingredients" UI section |

### Modified files
| File | Change |
|------|--------|
| `app/api/cron/scrape/route.ts` | After recipes, call `scrapeAllRetailers()` to refresh `GroceryPrice` |
| `app/(dashboard)/recipes/[id]/page.tsx` | Render `<ShopIngredients ingredients={recipe.ingredients} />` |
| `lib/admin-models.ts` | Register `groceryprice` as a read-only admin model (consistency with `foodlog`) |
| `locales/en.json`, `locales/ge.json` | i18n keys for the shop section |

---

## Data Model — `GroceryPrice`

```ts
interface IGroceryPrice {
  retailer: 'orinabiji' | 'agrohub' | 'nikora'
  productName: string        // as listed (Georgian, original)
  productNameEn?: string      // optional English translation cached from matcher
  searchText: string          // normalized lowercase Georgian for matching/index
  price: number               // GEL
  unit?: string               // 'kg' | 'pcs' | '500g' etc., as listed
  sourceUrl: string           // live product/category page for verification
  scrapedAt: Date
}
```
Indexes: `{ retailer: 1, searchText: 1 }` for match lookups; `{ scrapedAt: 1 }` for freshness/cleanup. Upsert on `{ retailer, sourceUrl }` (or `{ retailer, productName }` when sourceUrl is a shared category page) so re-scrapes update in place rather than duplicate.

---

## Adapters

Each adapter exports `scrape(): Promise<ScrapedProduct[]>` and `refreshOne(query: string): Promise<ScrapedProduct[]>`. A failing adapter logs and returns `[]` — never throws, so one retailer being down never breaks the others or the cron.

```ts
// lib/grocery/types.ts
export type Retailer = 'orinabiji' | 'agrohub' | 'nikora'
export interface ScrapedProduct {
  retailer: Retailer
  productName: string
  price: number
  unit?: string
  sourceUrl: string
}
```

- **orinabiji.ts** — `GET catalog-api.orinabiji.ge/.../warehouses` → pin first warehouseId; `POST .../products/search?lang=ge&warehouseId=<id>` paginated; price at `product.stock.price`.
- **agrohub.ts** — `GET https://agrohub.ge` to capture the `agrohub-access_token` cookie; `GET api.agrohub.ge/v1/Products?Page=N&Limit=100` with `Authorization: Bearer <token>`.
- **nikora.ts** — fetch promo/seasonal catalog pages via sitemap; cheerio-parse split lari/tetri spans; percent-encode Georgian URLs. Reuses the `fetchHtml` pattern from `lib/scrapers.ts`.

`scrapeAllRetailers()` runs the three adapters with `Promise.allSettled`, then upserts all results into `GroceryPrice`. Each adapter capped (e.g. ~300 staple products) to fit the cron's 300s budget; the cap is logged.

---

## Matching Layer — `lib/grocery/match.ts`

```ts
matchIngredients(ingredients: string[]): Promise<MatchedIngredient[]>
```
For each English ingredient (e.g. "2 large eggs"):
1. Strip quantities/units to a core food term ("eggs").
2. One batched AI call (OpenRouter, the same strong free model used for food logging) translates the core terms to Georgian search terms. AI returns ONLY translations — no prices.
3. For each translated term, query `GroceryPrice` (`searchText` regex/contains) per retailer, pick the lowest `price` per retailer.
4. Return `{ ingredient, term, matches: { retailer, productName, price, unit, sourceUrl, scrapedAt }[] }`. Empty `matches` → UI shows "not available".

`MatchedIngredient[]` also enables the **basket total per retailer** (sum of cheapest match per ingredient that the retailer carries; flag ingredients a retailer is missing).

---

## API Routes

- **`POST /api/grocery/match`** — body `{ ingredients: string[] }` → `{ items: MatchedIngredient[], baskets: { retailer, total, missing }[] }`. Auth-gated.
- **`POST /api/grocery/refresh`** — body `{ retailer, term }` → re-scrapes that one product live via the adapter's `refreshOne`, upserts, returns the fresh row. Auth-gated. `maxDuration = 60`.

---

## UI — `ShopIngredients.tsx`

Rendered on the recipe detail page below the ingredients list.
- Per ingredient: the term + cheapest retailer + price + "updated Xh ago" + a refresh icon (calls `/api/grocery/refresh`). "not available" when unmatched.
- A **basket comparison** card: total cost per retailer side by side (e.g. "Ori Nabiji ₾18.40 · Agrohub ₾21.10 · Nikora —"), cheapest highlighted, missing-item count noted.
- Each price links to its `sourceUrl` (opens retailer page).
- Matches the existing recipes design language (cards, CSS vars, Fraunces headers). i18n via `t()`.
- Loading + empty states; if the whole match call fails, a quiet "prices unavailable right now" — never blocks the recipe.

---

## Cron Integration

Vercel Hobby allows **1 cron/day**; it already runs `/api/cron/scrape` at 03:00. Extend that handler: after the recipe scrape loop, call `scrapeAllRetailers()`. Both share the `maxDuration = 300` budget — grocery adapters are capped and run after recipes so a grocery failure can't abort recipe scraping (wrap in try/catch). The cron stays a single Vercel entry.

---

## Error Handling
- Any adapter failure → `[]`, logged, others proceed.
- Token/warehouse fetch failure → that adapter yields `[]`.
- AI translate failure → ingredient returns empty matches ("not available"), never a fake price.
- Match route total failure → UI shows "prices unavailable", recipe still renders.
- Live refresh failure → keep showing cached price + a small "couldn't refresh" note.

## Testing
- No test runner in repo (per Spec A). Verify with `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Each adapter has a manual smoke step: run its `scrape()` from a throwaway script / route and confirm real ₾ prices + sourceUrls come back.
- Manual: open a recipe, confirm per-ingredient prices, basket comparison, source links, live refresh.

## i18n
New keys under `recipes.shop_*` / `grocery.*` in both `en` and `ge`.

## Out of scope
- Carrefour (Akamai) and SPAR (dead store).
- Delivery/cart integration — we link to the retailer, we don't order.
- Quantity-accurate basket math (e.g. "200g of a 1kg pack") — v1 compares per-listed-product price; quantity scaling is a future enhancement.
