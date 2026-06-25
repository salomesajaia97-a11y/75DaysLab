# Recipe & Grocery Assistant — Design Spec

**Date:** 2026-06-25
**Status:** Approved
**Builds on:** `2026-06-24-grocery-price-intelligence-design.md` (the price backbone — approved, not yet built)

---

## Overview

Turn the user's three real requests into working features, backed by real data only:

1. **"I have X, Y at home"** → suggest a recipe (own DB + live web), then for missing ingredients show real cheapest-store prices and a buy-list.
2. **"Where can I buy X cheapest?"** → return the cheapest Georgian retailer for X from real scraped prices, with a source link and freshness.
3. **"Recipe for X"** → search the open web (Google), scrape the result pages, and present the **full recipe inline** (title, ingredients, steps). **No links shown — the recipe content itself.**

Two core truth principles, inherited and extended:
- **Prices are never invented.** Every ₾ figure is a real `GroceryPrice` row with `sourceUrl` + `scrapedAt`. No confident match → "not available". (From the price spec.)
- **Recipes are real, not hallucinated.** Mode 3 recipes come from actually-fetched web pages parsed via `schema.org/Recipe` JSON-LD. If web search/extraction yields nothing, fall back to the Recipe DB. The model formats fetched content; it does not invent a recipe from nothing.

This spec assumes the price backbone (Part A) is built per its own spec. Parts B and C are new.

---

## Part A — Price backbone (build per existing spec, unchanged)

Implement `2026-06-24-grocery-price-intelligence-design.md` as written:
- `models/GroceryPrice.ts`, `lib/grocery/{types,orinabiji,agrohub,nikora,index,match}.ts`
- `app/api/grocery/match/route.ts`, `app/api/grocery/refresh/route.ts`
- `components/recipes/ShopIngredients.tsx`
- Cron extension in `app/api/cron/scrape/route.ts`
- Retailers: Ori Nabiji, Agrohub, Nikora. Real prices only.

The new chat modes (Part C) reuse `lib/grocery/match.ts` and the `GroceryPrice` model directly — no duplicate price logic.

---

## Part B — Live recipe web-search (new)

### New files
| File | Purpose |
|------|---------|
| `lib/recipes/websearch.ts` | Google Custom Search wrapper → candidate URLs |
| `lib/recipes/extract.ts` | Fetch a page + parse `schema.org/Recipe` JSON-LD → `WebRecipe` |
| `lib/recipes/find.ts` | Orchestrator: search → extract top N → rank → return `WebRecipe[]` |
| `app/api/recipes/web-search/route.ts` | POST `{ query }` → `{ recipes: WebRecipe[] }`, auth-gated |

### Search — `lib/recipes/websearch.ts`
- Uses **Google Programmable Search (Custom Search JSON API)**, configured to **search the entire web** (not domain-locked).
- Env: `GOOGLE_CSE_KEY`, `GOOGLE_CSE_ID`. Free tier ~100 queries/day.
- Query is built as `<dish> recipe`; for Georgian-language requests append/translate so Georgian sites surface.
- Returns up to ~8 candidate result URLs + titles.
- **Missing env or API error → returns `[]`** (caller falls back to Recipe DB). Never throws.

### Extraction — `lib/recipes/extract.ts`
- `extractRecipe(url): Promise<WebRecipe | null>`.
- Fetch HTML (reuse the `fetchHtml` pattern from `lib/scrapers.ts`: UA header, timeout, error → null).
- Parse `<script type="application/ld+json">` blocks; find an object with `@type` containing `Recipe` (handles arrays / `@graph`).
- Map: `name`, `recipeIngredient[]`, `recipeInstructions[]` (string or `{text}` objects), optional `totalTime`, `recipeYield`, image.
- Heuristic fallback (best-effort `<li>` scan) only if no JSON-LD; if still nothing → `null`.

```ts
// lib/recipes/types.ts (or inline in find.ts)
export interface WebRecipe {
  title: string
  ingredients: string[]
  instructions: string[]
  totalTimeMin?: number
  servings?: string
  imageUrl?: string
  sourceDomain: string   // kept internally for ranking/debug; NOT displayed to the user
}
```

### Orchestrator — `lib/recipes/find.ts`
- `findWebRecipes(query): Promise<WebRecipe[]>`.
- Search → extract candidates in parallel (`Promise.allSettled`) → drop `null`s.
- **Rank:** soft-boost preferred quality/Georgian domains (`eatingwell.com`, `nutrition.gov`, `kulinaria.ge`, …) above generic results; otherwise preserve search order.
- Return top 3 complete `WebRecipe`s (must have ≥3 ingredients and ≥1 instruction step to count as complete).

### Presentation
- API returns structured `WebRecipe[]`. The **source links/domains are never sent to the client UI nor shown in chat** — only title, ingredients, steps, optional time/servings/image. (Per user instruction: recipes, not links.)

---

## Part C — Chat modes in LabAI (`/api/ai/chat`, extended)

Mechanism: **intent classification + real-data injection**, the same shape as the existing USDA `food_log` flow (`fetchUsdaContext` → injected into the system prompt). No model tool-calling (Llama 3.1 8B tool-calling is unreliable; the repo already proved the inject pattern works).

### Flow
1. Request body gains an optional explicit `mode`, but the route also **classifies intent** from the message when `mode` is `chat`:
   - `grocery_price` — "where … buy / cheapest / price of <X>"
   - `recipe_web` — "recipe for <X>", "how do I make <X>"
   - `cook_from_pantry` — "I have <list> at home, what can I cook"
   - else → normal `chat`.
   - Classification: a cheap keyword/regex first pass; if ambiguous, the model is told to ask a clarifying question rather than guess.
2. Based on intent, gather **real data server-side** before the model call:
   - `grocery_price`: extract the food term → `matchIngredients([term])` (Part A) → inject the matched rows (retailer, price, unit, sourceUrl, scrapedAt) into the prompt as a `GROCERY PRICE DATA` block. Empty → instruct model to say "not available" + offer the store links.
   - `recipe_web`: `findWebRecipes(message)` → inject the top recipe's structured content as a `WEB RECIPE` block; empty → fall back to a Recipe DB query, else tell the user nothing was found.
   - `cook_from_pantry`: parse the pantry list; pick/confirm a recipe (DB or web); diff recipe ingredients vs pantry → run `matchIngredients` on the **missing** ones → inject both the recipe and the priced buy-list.
3. The system prompt gets new injected blocks + rules:
   - "Only state prices present in GROCERY PRICE DATA. Never invent a price. Missing → 'not available' and point to the official store links."
   - "When WEB RECIPE data is present, present that recipe's ingredients and steps. Do not output URLs or source names."
   - Existing tone/length/health-coach rules stay.
4. Response still returned via the existing `{ message, macros }` shape; new modes won't emit `<macros>` unless the user logs food.

### Modified files
| File | Change |
|------|--------|
| `app/api/ai/chat/route.ts` | Intent classify; call `matchIngredients` / `findWebRecipes`; build injected blocks |
| `lib/ai.ts` | `buildSystemPrompt` accepts optional `groceryContext` + `webRecipeContext`; add the truth rules |
| `lib/grocery/match.ts` | reused as-is (Part A) |
| `lib/recipes/find.ts` | reused (Part B) |
| `locales/en.json`, `locales/ge.json` | any new chat-surface strings |

### Store links (official)
When prices are unavailable or the user asks where to shop generally, the model may surface the official store links from the project's recipe-suggestion policy: Carrefour, Agrohub, Nikora, 2 Nabiji, Spar, Magniti, Smart. These are static informational links, not price claims.

---

## Environment / setup
New env vars (documented for the user to create):
- `GOOGLE_CSE_KEY` — Google Cloud API key with Custom Search API enabled.
- `GOOGLE_CSE_ID` — Programmable Search Engine id, configured to "Search the entire web".

All new external calls degrade gracefully when keys are absent (recipe web-search → DB fallback; grocery already degrades per Part A).

## Error handling
- Web search/extract failure → `[]` → DB fallback → if still empty, model says it couldn't find a recipe. Never a hallucinated recipe.
- Grocery match failure → "not available" + store links. Never a fake price.
- Intent misclassification → on ambiguity the model asks one clarifying question.
- Chat route already returns 502 on OpenRouter failure; unchanged.

## Testing
- No unit test runner relied on (per prior specs); verify with `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Manual smoke: (a) `findWebRecipes('khachapuri')` returns a real parsed recipe; (b) chat "where can I buy eggs cheapest" returns a real GroceryPrice-backed answer or "not available"; (c) chat "recipe for shakshuka" returns full inline recipe with no links; (d) chat "I have eggs, rice, onion — what can I cook" returns a recipe + priced buy-list for missing items.
- JSON-LD extraction tested against eatingwell.com, nutrition.gov, kulinaria.ge sample URLs.

## Out of scope
- Price backbone internals (covered by its own spec).
- Delivery/cart/ordering — we inform, we don't order.
- Persisting web-searched recipes into the Recipe DB (possible future enhancement).
- Quantity-accurate basket math (carried over from price spec).
- Streaming chat / multi-turn memory (chat route stays single-shot as today).
