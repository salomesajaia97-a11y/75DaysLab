# Merge Nutrition + Recipes into one page — Design

**Date:** 2026-06-24
**Status:** Approved (layout + route decisions confirmed via brainstorming)

## Goal

Collapse the two separate dashboard pages (`/nutrition` and `/recipes`) into a single,
beautiful, informative food page. The merged page leads with today's macro tracking,
adds a time-slotted **meal planner** (per screenshot #1), and keeps full recipe
discovery below.

## Decisions (locked)

- **Layout:** Planner + recipes below. Top = macro dashboard; middle = time-slotted meal
  planner; bottom = recipe browser.
- **Route:** Merged page lives at `/nutrition`. Recipes sidebar item removed. `/recipes`
  redirects to `/nutrition`. `/recipes/[id]` recipe detail page is unchanged.

## Page structure (`app/(dashboard)/nutrition/page.tsx`)

Top → bottom:

1. **Header** — `nutrition.title` + `nutrition.today` badge. Admin scrape buttons and the
   "Add Dish" button (currently in recipes header) move here.
2. **MacroDashboard** — calorie ring + protein/carb/fat bars. Reused as-is (screenshot #2).
3. **WeeklyChart** — 7-day calorie chart + day selector. Reused as-is.
4. **MealPlanner** (NEW) — four time-slotted cards in `MEAL_ORDER`:
   - breakfast `08:00–10:00`, lunch `12:00–15:00`, dinner `18:00–21:00`, snack (all day).
   - Each card: emoji + meal name + time range, per-slot kcal total, `+` button.
   - Logged entries for that meal render inside the card (photo thumb, description,
     P/C/F, kcal). Empty slot shows an "empty" placeholder.
   - Only interactive (`+`, add) when `selectedDate === TODAY`.
5. **FoodLogger** — AI food log. Reused. A slot's `+` preselects that meal and scrolls
   the logger into view.
6. **RecipeBrowser** (NEW component, extracted from `recipes/page.tsx`) — featured banner,
   lens tabs, filter pills, site-grouped recipe cards, Add-Dish modal, admin scrape,
   60 s auto-refresh.

## Components

### `components/nutrition/MealPlanner.tsx` (new)
- **Does:** Render the 4 meal slots from the day's food log; surface a `+` per slot.
- **Props:** `{ foodLog: FoodEntry[], interactive: boolean, onAddMeal: (m: MealType) => void }`.
- **Depends on:** `MEAL_ORDER`, `MEAL_TIME_RANGES` (new), `useLanguage`, framer-motion.
- Pure presentation + one callback; no fetching.

### `components/recipes/RecipeBrowser.tsx` (new)
- **Does:** All recipe discovery UI currently inside `RecipesPage` — fetch, lens/pills,
  grouping, featured banner, cards, Add modal, admin scrape, auto-refresh.
- **Props:** none (self-contained, like the page was).
- **Depends on:** `/api/recipes`, `/api/recipes/scrape`, `useSession`, `useLanguage`.
- Moves `Recipe` type, `RecipeCard`, `SkeletonCard`, lens/pill constants, `buildQuery`,
  `groupBySite` with it.

### `lib/nutrition-meal.ts` (edit)
Add a time-range map consumed by the planner:
```ts
export const MEAL_TIME_RANGES: Record<MealType, string | null> = {
  breakfast: '08:00 – 10:00',
  lunch:     '12:00 – 15:00',
  dinner:    '18:00 – 21:00',
  snack:     null, // "all day"
}
```

## Routing changes

- `app/(dashboard)/recipes/page.tsx` → replaced with `redirect('/nutrition')` (server
  component). `app/(dashboard)/recipes/[id]/page.tsx` untouched.
- `components/shared/DashboardSidebar.tsx` → remove the `/recipes` link (drop `ChefHat`
  import if now unused).

## i18n (en + ge)

Add planner keys:
- `nutrition.meal_planner` = "Meal Planner" / "კვების გეგმა"
- `nutrition.slot_empty` = "Empty" / "ცარიელია"
- `nutrition.snack_allday` = "During the day" / "დღის განმავლობაში"
- `nutrition.recipes_heading` = "Recipes" / reuse `recipes.title`

Reuse existing `nutrition.*` and `recipes.*` keys. Optionally rename `nav.nutrition`
label to "Food"/"კვება" — out of scope unless requested; keep "Nutrition".

## Data flow

`NutritionPage` owns state (targets, consumed, foodLog, selectedDate, week) exactly as
today. It passes `foodLog` + `interactive` + `onAddMeal` to `MealPlanner`. `onAddMeal`
sets the FoodLogger's meal and scrolls to it (a ref + a `pendingMeal` state lifted into
the page, or expose `FoodLogger`'s meal setter via a controlled prop — see plan).
`RecipeBrowser` is fully independent and fetches its own data.

## Error handling

No new failure modes. Existing fetch `.catch(() => {})` patterns preserved on move.
Redirect is synchronous server-side. Empty recipe / empty log states already handled.

## Testing / verification

- Type-check + lint pass (`next build` or `tsc`).
- Manual: `/nutrition` shows ring + planner + recipes; slot `+` preselects meal & scrolls;
  `/recipes` redirects to `/nutrition`; `/recipes/<id>` still opens detail; sidebar no
  longer shows Recipes; Georgian locale renders new keys.

## Out of scope (YAGNI)

- Per-slot recipe suggestions feeding the planner (rejected option C).
- Top-level Track/Recipes tabs (rejected option B).
- Drag-to-reorder, scheduled future meals, recipe→log "cook this" flow.
- Renaming the nav label.
