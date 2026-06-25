# Add-Food Sheet — Design

Date: 2026-06-25
Status: Approved (design)

## Goal

On the nutrition page (`კვება` tab), tapping the **+** on a meal card (საუზმე / სადილი / ვახშამი / სნექი)
opens a slide-up bottom sheet for adding food to **that** meal. The user picks an input method,
the food's macros are estimated, the entry is saved, and the daily totals + macro rings + per-macro
"remaining" values update live. This matches the reference screenshots (`დაამატე საკვები` sheet).

## Current state (already works)

- `MacroDashboard` + `MealPlanner` render the rings, per-meal cards, and "remaining" math.
- Text logging: `POST /api/ai/chat` (mode `food_log`, USDA + AI) → macros.
- Photo logging: `POST /api/nutrition/scan` (Cloudinary + Vision AI) → macros.
- Save: `POST /api/nutrition` with `{ description, calories, proteinG, carbsG, fatG, meal, photoUrl }`.
- Totals: `GET /api/nutrition?date=` reduces logs; client increments `consumed` on each new entry.
- `handleAddMeal(meal)` currently just **scrolls** to an inline `FoodLogger`.

## Gap

The meal **+** does not open a method picker. The 4-method sheet
(text / camera / gallery / favorites) exists only in `RecipeBrowser` and its buttons are stubbed.
No favorites data.

## Design

### Components

**`components/nutrition/AddFoodSheet.tsx`** (new)
- Bottom sheet (fixed, slide-up, backdrop), styled like screenshot 2.
- Props: `meal: MealType`, `open: boolean`, `onClose()`, `onLogged(entry)`.
- **Step 1 — method tiles:** `ტექსტით` (text), `კამერა` (camera), `გალერეა` (gallery), `ფავორიტები` (favorites),
  each with icon + subtitle, colors from screenshot (orange/blue/purple/green).
- **Step 2 — method panel:**
  - **text** → textarea → calls AI `food_log` → macro preview → confirm.
  - **camera** → `<input type="file" accept="image/*" capture="environment">` → scan → preview → confirm.
  - **gallery** → `<input type="file" accept="image/*">` → scan → preview → confirm.
  - **favorites** → list from `GET /api/nutrition/favorites` → tap a row → log immediately.
- A "preview & confirm" row shows estimated kcal / P / C / F before saving, so user sees the numbers.
- Header shows the target meal label; a back arrow returns to Step 1.

**Shared logging logic** — extract the existing `handlePhoto` (scan) and `logFood` (AI + save) flows
from `FoodLogger.tsx` into a small hook `useFoodLogging(meal, onLogged)` in
`components/nutrition/useFoodLogging.ts`. Both `AddFoodSheet` and the inline `FoodLogger` consume it
(no duplicated fetch logic).

### Favorites (auto from history — no new model)

- `GET /api/nutrition/favorites` → query the user's `FoodLog`, group by normalized `description`,
  return distinct foods (latest macros per food) ordered by frequency then recency, limit ~20.
- Tapping a favorite re-logs it to the current `meal` via the existing `POST /api/nutrition`.

### Page wiring — `app/(dashboard)/nutrition/page.tsx`

- Add state `sheetMeal: MealType | null`.
- `handleAddMeal(meal)` → `setSheetMeal(meal)` (open sheet) instead of scroll.
- Render `<AddFoodSheet meal={sheetMeal} open={!!sheetMeal} onClose={() => setSheetMeal(null)} onLogged={handleLogged} />`.
- `handleLogged` already updates `consumed` + `foodLog` → rings/remaining update live. Close sheet after log.
- Remove the inline `FoodLogger` section (sheet replaces it). Keep `RecipeBrowser` untouched.

### i18n — `locales/ge.json`

Add `nutrition.add.title` = `დაამატე საკვები` and reuse/add labels+subtitles:
`nutrition.add.text` / `_desc`, `.camera` / `_desc`, `.gallery` / `_desc`, `.favorites` / `_desc`.
(Mirror the existing `recipes.add.*` strings.)

## Data flow

```
+ on meal card → setSheetMeal(meal) → AddFoodSheet opens
  text/photo → estimate macros → preview → POST /api/nutrition {meal} → onLogged(entry)
  favorite   → GET favorites → tap → POST /api/nutrition {meal} → onLogged(entry)
onLogged → consumed += macros → MacroDashboard rings + per-macro remaining re-render → close sheet
```

## Error handling

- Scan/AI failure → inline sheet error ("describe it instead"), stays open. Reuse existing strings.
- Empty text / no macros → disable confirm.
- Favorites fetch failure → empty state, methods still usable.

## Out of scope

- Explicit star/favorite model, edit/delete of logged entries, recipe→diary quick add.

## Testing

- Unit: favorites aggregation (group/dedupe/order) given sample FoodLog rows.
- Manual: tap + on each meal → each of the 4 methods logs → rings + remaining update for the right meal.
