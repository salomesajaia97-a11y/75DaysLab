# Nutrition UX Upgrade — Design Spec

**Date:** 2026-06-24
**Status:** Approved
**Sibling spec:** `2026-06-24-grocery-price-intelligence-design.md` (Spec B, built after this)

---

## Overview

Upgrade the existing `/nutrition` page with three Fitio-inspired features, woven into the platform's existing minimalist design language (Fraunces serif headers, earth-tone macro accents, Framer Motion). No visual copying — same components and tokens already in use.

1. **Meal categories** — group the food log into Breakfast / Lunch / Dinner / Snacks with per-meal calorie subtotals. Hybrid assignment: auto-suggest meal by log time, user can override via chip.
2. **Photo scan** — wire the existing (currently dead) "scan photo" button. Upload → Cloudinary → vision model estimates macros → pre-fills the logger for user confirmation. Photo persists on the log row.
3. **Weekly history** — 7-day calorie bar chart below the ring; tap a day to view that day's log.

All three extend existing files; no new subsystems.

---

## Feature 1 — Meal Categories

### Data model change
Add to `models/FoodLog.ts`:
```ts
meal: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack'], default: 'snack' }
```
Existing logs without a `meal` default to `snack` (backward-safe; no migration needed).

Add to `FoodEntry` type (`types/index.ts`): `meal: MealType` where `MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'`.

### Time → meal heuristic (`lib/nutrition-meal.ts`, new)
```
mealFromTime(date): before 11:00 → breakfast | 11:00–15:59 → lunch | 16:00–21:00 → dinner | else → snack
```
Pure function, unit-testable in isolation.

### UX
- **FoodLogger**: above the textarea, a row of 4 meal chips. The time-derived meal is pre-selected; user can tap another. Selected meal sent in the POST body.
- **Nutrition page**: replace the flat log list with 4 meal sections (only render sections that have entries OR are the current-time meal). Each section header shows meal name + summed kcal. Existing row markup reused inside each section.

### API
`app/api/nutrition/route.ts`:
- POST accepts optional `meal`; defaults via `mealFromTime` server-side if absent.
- GET response adds `meal` to each log (already returns full doc; just include field).

---

## Feature 2 — Photo Scan (AI vision)

### Flow
```
User taps "scan photo" → file picker → image selected
  → POST /api/nutrition/scan  (multipart: image)
      → uploadPhoto(buffer, 'foodlogs')           [lib/cloudinary.ts, existing]
      → vision model reads Cloudinary URL → estimates {food, calories, proteinG, carbsG, fatG}
      → returns { photoUrl, macros }
  → FoodLogger pre-fills description + stashes photoUrl + macros (does NOT auto-save)
  → user reviews/edits, taps "Log Food" → POST /api/nutrition includes photoUrl
```
User confirmation step is deliberate — vision estimates are approximate, user keeps control.

### Vision model
`lib/ai.ts`: add `parseFoodPhoto(imageUrl: string): Promise<MacroData | null>`.
- New OpenRouter call using a **vision-capable model** (e.g. `meta-llama/llama-3.2-11b-vision-instruct:free`), `image_url` content part pointing at the Cloudinary URL.
- Reuses the existing `<macros>` JSON contract + `parseMacros()`. Returns `null` on failure → UI shows "couldn't read photo, describe it instead" and falls back to text entry.

### New file
`app/api/nutrition/scan/route.ts` — auth-gated POST, reads multipart, uploads, calls `parseFoodPhoto`, returns JSON. `maxDuration = 60`.

### Persistence
`photoUrl` already exists on `FoodLog`. POST `/api/nutrition` accepts and stores it. Log row renders a small thumbnail when `photoUrl` present.

---

## Feature 3 — Weekly History

### API
`app/api/nutrition/week/route.ts` (new) — GET returns last 7 days:
```
[{ date: '2026-06-18', calories: 1840, target: 2000 }, ...]
```
Aggregates `FoodLog` totals per day for the authed user (Mongo aggregation on `userId` + date range). Target from user profile via existing `calculateMacros`.

### UI — `components/nutrition/WeeklyChart.tsx` (new)
- 7 vertical bars (Mon–Sun or rolling 7-day), height = calories / max. Bar fill uses `--foreground`; today highlighted; bars over target tinted with the warm accent `#c07c5e`.
- Tap a bar → calls `onSelectDay(date)`; nutrition page refetches that day's log + totals (existing `/api/nutrition?date=` path) so the ring + sections reflect the selected day. A "viewing {date}" pill with a "back to today" reset appears when not today.
- Framer Motion: bars animate height on mount, matching the ring's existing easing.

Placed between the MacroDashboard section and the Log a Meal section.

---

## Files Summary

### New
| File | Purpose |
|------|---------|
| `lib/nutrition-meal.ts` | `mealFromTime` heuristic + `MealType` |
| `app/api/nutrition/scan/route.ts` | Photo upload + vision macro estimate |
| `app/api/nutrition/week/route.ts` | 7-day calorie aggregation |
| `components/nutrition/WeeklyChart.tsx` | 7-day bar chart |
| `components/nutrition/MealChips.tsx` | 4 meal selector chips |

### Modified
| File | Change |
|------|--------|
| `models/FoodLog.ts` | Add `meal` enum field |
| `types/index.ts` | Add `MealType`, `meal` on `FoodEntry` |
| `lib/ai.ts` | Add `parseFoodPhoto` (vision) |
| `app/api/nutrition/route.ts` | Accept/return `meal`, accept `photoUrl` |
| `components/nutrition/FoodLogger.tsx` | Meal chips + working photo scan + photoUrl passthrough |
| `app/(dashboard)/nutrition/page.tsx` | Meal-grouped log, weekly chart, day selection |

---

## Error Handling
- Photo scan failure → graceful fallback to text entry, no crash.
- Vision model unavailable → same fallback message.
- Week aggregation empty → chart renders empty bars (no error state).
- Meal field absent on old logs → defaults to `snack`.

## Testing
- `mealFromTime` — unit test boundary hours (10:59→breakfast, 11:00→lunch, 16:00→dinner, 22:00→snack).
- `parseMacros` already covers the `<macros>` contract; `parseFoodPhoto` reuses it.
- Manual: log via photo, log per meal, switch days on the weekly chart.

## i18n
All new strings go through the existing `useLanguage()` / `t()` system (Georgian + English), matching current nutrition page keys.

## Out of scope (Spec B)
Grocery price comparison, market scrapers, ingredient matching — separate spec.
