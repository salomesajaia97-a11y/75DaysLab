# Nutrition + Recipes Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge `/nutrition` and `/recipes` into one page at `/nutrition` — macro dashboard, a new time-slotted meal planner, then full recipe discovery.

**Architecture:** `NutritionPage` stays the stateful orchestrator. Two new presentational components: `MealPlanner` (slots from the day's food log) and `RecipeBrowser` (extracted verbatim from the old recipes page). `/recipes` becomes a server redirect to `/nutrition`; the Recipes sidebar link is removed. No data-model change — the `meal` field already exists on food entries.

**Tech Stack:** Next.js (App Router, see `node_modules/next/dist/docs/`), React client components, framer-motion, lucide-react, Tailwind CSS vars, vitest (node env, `lib/**/*.test.ts` only).

## Global Constraints

- This is NOT stock Next.js — read the relevant guide in `node_modules/next/dist/docs/` before writing routing/redirect code.
- Styling uses CSS custom properties (`var(--card)`, `var(--border)`, `var(--foreground)`, `var(--muted-foreground)`, `var(--primary)`, `var(--primary-foreground)`, `var(--muted)`) and the serif font `var(--font-fraunces)`. Match existing usage.
- All user-facing strings go through `useLanguage()`'s `t(key)` and must exist in BOTH `locales/en.json` and `locales/ge.json` (flat key→string maps).
- Vitest config (`vitest.config.ts`) only includes `lib/**/*.test.ts`, environment `node`. There is NO React/jsdom test setup — do NOT write component render tests. Component tasks verify via `npm run lint` + `npm run build` + manual check.
- Commit after each task. Work on `main` (project convention: no feature branches).

---

### Task 1: Meal time ranges constant

**Files:**
- Modify: `lib/nutrition-meal.ts`
- Test: `lib/nutrition-meal.test.ts` (create)

**Interfaces:**
- Consumes: existing `MealType`, `MEAL_ORDER` from `lib/nutrition-meal.ts`.
- Produces: `export const MEAL_TIME_RANGES: Record<MealType, string | null>` — time-range label per meal, `null` for snack (rendered as "all day").

- [ ] **Step 1: Write the failing test**

Create `lib/nutrition-meal.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { MEAL_TIME_RANGES, MEAL_ORDER } from './nutrition-meal'

describe('MEAL_TIME_RANGES', () => {
  it('has an entry for every meal in MEAL_ORDER', () => {
    for (const m of MEAL_ORDER) {
      expect(m in MEAL_TIME_RANGES).toBe(true)
    }
  })

  it('gives breakfast/lunch/dinner a time string and snack null', () => {
    expect(MEAL_TIME_RANGES.breakfast).toBe('08:00 – 10:00')
    expect(MEAL_TIME_RANGES.lunch).toBe('12:00 – 15:00')
    expect(MEAL_TIME_RANGES.dinner).toBe('18:00 – 21:00')
    expect(MEAL_TIME_RANGES.snack).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- nutrition-meal`
Expected: FAIL — `MEAL_TIME_RANGES` is not exported / undefined.

- [ ] **Step 3: Add the constant**

Append to `lib/nutrition-meal.ts` (after the existing `mealFromTime` function):

```ts
/** Display time-range label per meal slot. `null` = no fixed time (snack, all day). */
export const MEAL_TIME_RANGES: Record<MealType, string | null> = {
  breakfast: '08:00 – 10:00',
  lunch:     '12:00 – 15:00',
  dinner:    '18:00 – 21:00',
  snack:     null,
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- nutrition-meal`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/nutrition-meal.ts lib/nutrition-meal.test.ts
git commit -m "feat(nutrition): meal time-range constants + test"
```

---

### Task 2: i18n keys for the planner

**Files:**
- Modify: `locales/en.json`
- Modify: `locales/ge.json`

**Interfaces:**
- Produces: translation keys `nutrition.meal_planner`, `nutrition.slot_empty`, `nutrition.snack_allday`, `nutrition.recipes_heading` available via `t(...)`.

- [ ] **Step 1: Add keys to `locales/en.json`**

Add these entries (place them near the existing `nutrition.*` keys; JSON is a flat map — keep valid commas):

```json
"nutrition.meal_planner": "Meal Planner",
"nutrition.slot_empty": "Empty",
"nutrition.snack_allday": "During the day",
"nutrition.recipes_heading": "Recipes"
```

- [ ] **Step 2: Add matching keys to `locales/ge.json`**

```json
"nutrition.meal_planner": "კვების გეგმა",
"nutrition.slot_empty": "ცარიელია",
"nutrition.snack_allday": "დღის განმავლობაში",
"nutrition.recipes_heading": "რეცეპტები"
```

- [ ] **Step 3: Verify both files are valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('locales/en.json','utf8'));JSON.parse(require('fs').readFileSync('locales/ge.json','utf8'));console.log('ok')"`
Expected: prints `ok` (no parse error).

- [ ] **Step 4: Commit**

```bash
git add locales/en.json locales/ge.json
git commit -m "feat(nutrition): i18n keys for meal planner (en+ge)"
```

---

### Task 3: MealPlanner component

**Files:**
- Create: `components/nutrition/MealPlanner.tsx`

**Interfaces:**
- Consumes: `FoodEntry` from `@/types`; `MEAL_ORDER`, `MEAL_TIME_RANGES`, `MealType` from `@/lib/nutrition-meal`; `useLanguage`; framer-motion; lucide-react `Plus`.
- Produces: `export function MealPlanner(props: MealPlannerProps)` where
  ```ts
  interface MealPlannerProps {
    foodLog: FoodEntry[]
    interactive: boolean
    onAddMeal: (meal: MealType) => void
  }
  ```

- [ ] **Step 1: Create the component**

Create `components/nutrition/MealPlanner.tsx`:

```tsx
'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Clock } from 'lucide-react'
import { MEAL_ORDER, MEAL_TIME_RANGES, type MealType } from '@/lib/nutrition-meal'
import { useLanguage } from '@/lib/i18n'
import type { FoodEntry } from '@/types'

const MEAL_EMOJI: Record<MealType, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍲',
  snack: '🧁',
}

const MACRO_ACCENT = { protein: '#c07c5e', carbs: '#c5a55a', fat: '#7a9e7e' }

interface MealPlannerProps {
  foodLog: FoodEntry[]
  interactive: boolean
  onAddMeal: (meal: MealType) => void
}

export function MealPlanner({ foodLog, interactive, onAddMeal }: MealPlannerProps) {
  const { t } = useLanguage()

  return (
    <div className="space-y-3">
      {MEAL_ORDER.map(meal => {
        const group = foodLog.filter(e => e.meal === meal)
        const kcal = group.reduce((sum, e) => sum + (e.calories ?? 0), 0)
        const range = MEAL_TIME_RANGES[meal] ?? t('nutrition.snack_allday')
        return (
          <div
            key={meal}
            className="rounded-2xl p-4"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl">{MEAL_EMOJI[meal]}</span>
                <div className="min-w-0">
                  <p
                    className="text-sm font-semibold leading-tight"
                    style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
                  >
                    {t(`nutrition.meal_${meal}`)}
                  </p>
                  <p className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    <Clock className="h-3 w-3" /> {range}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {kcal > 0 && (
                  <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                    {kcal} kcal
                  </span>
                )}
                {interactive && (
                  <button
                    type="button"
                    onClick={() => onAddMeal(meal)}
                    aria-label={`Add to ${meal}`}
                    className="h-8 w-8 rounded-full flex items-center justify-center transition-all hover:opacity-80 active:scale-95"
                    style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {group.length === 0 ? (
              <p className="text-center text-xs py-2" style={{ color: 'var(--muted-foreground)' }}>
                {t('nutrition.slot_empty')}
              </p>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {group.map(entry => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center justify-between rounded-xl px-3 py-2"
                      style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
                    >
                      <div className="flex items-center min-w-0 mr-3">
                        {entry.photoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={entry.photoUrl} alt="" className="w-8 h-8 rounded-lg object-cover mr-2.5 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{entry.description}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                            <span style={{ color: MACRO_ACCENT.protein }}>P {entry.proteinG}g</span>
                            {' · '}
                            <span style={{ color: MACRO_ACCENT.carbs }}>C {entry.carbsG}g</span>
                            {' · '}
                            <span style={{ color: MACRO_ACCENT.fat }}>F {entry.fatG}g</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                          {entry.calories}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>kcal</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Lint the new file**

Run: `npm run lint`
Expected: no errors for `components/nutrition/MealPlanner.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/nutrition/MealPlanner.tsx
git commit -m "feat(nutrition): MealPlanner component with time-slotted meal cards"
```

---

### Task 4: Extract RecipeBrowser component

**Files:**
- Create: `components/recipes/RecipeBrowser.tsx`

**Interfaces:**
- Consumes: `/api/recipes`, `/api/recipes/scrape`; `useSession`, `useLanguage`.
- Produces: `export function RecipeBrowser()` — self-contained, no props. Renders the featured banner, lens tabs, filter pills, site-grouped recipe cards, Add-Dish modal, admin scrape buttons, and 60 s auto-refresh.

- [ ] **Step 1: Create the component by moving recipe logic out of the page**

Create `components/recipes/RecipeBrowser.tsx`. Copy the ENTIRE current body of `app/(dashboard)/recipes/page.tsx` — the `Recipe` interface, `PillKey`/`LensKey` types, `LENSES`, `PILL_LABELS`, `PILL_PARAMS`, `buildQuery`, `GRADIENT_POOL`, `EMOJI_POOL`, `cardGradient`, `cardEmoji`, `RecipeCard`, `SkeletonCard`, `ADD_OPTIONS`, `GroupedRecipes`, `SITE_LABELS`, `SCRAPE_TARGETS`, `groupBySite` — then rename the default-export `RecipesPage` to a named export `RecipeBrowser`:

Change the imports block at the top to keep all the ones the moved code uses:
```tsx
'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Clock, Flame, Plus, X, Type, Camera, Image as ImageIcon, Star, RefreshCw } from 'lucide-react'
import NextImage from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useSession } from 'next-auth/react'
```

Change the component declaration line from:
```tsx
export default function RecipesPage() {
```
to:
```tsx
export function RecipeBrowser() {
```

Keep the entire JSX return as-is, INCLUDING the outer wrapper `<div className="max-w-4xl mx-auto py-2 space-y-6">` (it will sit inside the page below the planner) — but change its top margin: replace `className="max-w-4xl mx-auto py-2 space-y-6"` with `className="space-y-6"` so it inherits the page's container/width instead of imposing its own.

Everything else (header with title + scrape + add button, featured banner, lens tabs, pills, groups, modal, mobile FAB) moves verbatim.

- [ ] **Step 2: Lint the new file**

Run: `npm run lint`
Expected: no errors for `components/recipes/RecipeBrowser.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/recipes/RecipeBrowser.tsx
git commit -m "refactor(recipes): extract RecipeBrowser component from page"
```

---

### Task 5: FoodLogger controlled-meal prop

**Files:**
- Modify: `components/nutrition/FoodLogger.tsx`

**Interfaces:**
- Consumes: existing `FoodLoggerProps`.
- Produces: extended props
  ```ts
  interface FoodLoggerProps {
    onLogged: (entry: FoodEntry) => void
    meal?: MealType            // when provided, meal is controlled by the parent
    onMealChange?: (m: MealType) => void
  }
  ```
  Behavior: if `meal` prop is provided, the component renders that meal and reports changes via `onMealChange`; otherwise it manages meal internally as today.

- [ ] **Step 1: Update the props interface**

In `components/nutrition/FoodLogger.tsx`, replace:
```tsx
interface FoodLoggerProps {
  onLogged: (entry: FoodEntry) => void
}
```
with:
```tsx
interface FoodLoggerProps {
  onLogged: (entry: FoodEntry) => void
  meal?: MealType
  onMealChange?: (m: MealType) => void
}
```

- [ ] **Step 2: Make the meal state optionally controlled**

Replace the destructure line:
```tsx
export function FoodLogger({ onLogged }: FoodLoggerProps) {
```
with:
```tsx
export function FoodLogger({ onLogged, meal: mealProp, onMealChange }: FoodLoggerProps) {
```

Replace:
```tsx
  const [meal, setMeal] = useState<MealType>(() => mealFromTime(new Date()))
```
with:
```tsx
  const [internalMeal, setInternalMeal] = useState<MealType>(() => mealFromTime(new Date()))
  const meal = mealProp ?? internalMeal
  const setMeal = (m: MealType) => {
    setInternalMeal(m)
    onMealChange?.(m)
  }
```

Leave all other uses of `meal` / `setMeal` unchanged (the `MealChips`, the POST body, and the post-log `setMeal(mealFromTime(new Date()))` reset all keep working).

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors for `components/nutrition/FoodLogger.tsx`.

- [ ] **Step 4: Commit**

```bash
git add components/nutrition/FoodLogger.tsx
git commit -m "feat(nutrition): optional controlled meal prop on FoodLogger"
```

---

### Task 6: Compose the merged nutrition page

**Files:**
- Modify: `app/(dashboard)/nutrition/page.tsx`

**Interfaces:**
- Consumes: `MacroDashboard`, `WeeklyChart`, `FoodLogger` (now with `meal`/`onMealChange`), `MealPlanner` (Task 3), `RecipeBrowser` (Task 4), `MealType`/`MEAL_ORDER` from `@/lib/nutrition-meal`, `mealFromTime`.
- Produces: the merged page UI.

- [ ] **Step 1: Add imports and meal/scroll state**

In `app/(dashboard)/nutrition/page.tsx`:

Add to the import block:
```tsx
import { useRef } from 'react'
import { MealPlanner } from '@/components/nutrition/MealPlanner'
import { RecipeBrowser } from '@/components/recipes/RecipeBrowser'
import { mealFromTime } from '@/lib/nutrition-meal'
```
(Merge `useRef` into the existing `import { useState, useEffect, useCallback } from 'react'` line, and add `mealFromTime` to the existing `@/lib/nutrition-meal` import which already pulls `MEAL_ORDER`, `type MealType`.)

Inside the component, after the existing `useState` hooks, add:
```tsx
  const [loggerMeal, setLoggerMeal] = useState<MealType>(() => mealFromTime(new Date()))
  const loggerRef = useRef<HTMLDivElement>(null)

  function handleAddMeal(m: MealType) {
    setLoggerMeal(m)
    loggerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
```

- [ ] **Step 2: Insert MealPlanner and wire the logger**

After the "This Week" `</section>` and the divider `<div className="h-px" ... />`, add a Meal Planner section, and wrap the existing FoodLogger in a ref'd div with the controlled meal props. Replace the existing block:

```tsx
      {/* Divider */}
      <div className="h-px" style={{ background: 'var(--border)' }} />

      {/* Log a Meal */}
      {isToday && (
        <section>
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--muted-foreground)' }}>
            {t('nutrition.log_meal')}
          </p>
          <FoodLogger onLogged={handleLogged} />
        </section>
      )}
```

with:

```tsx
      {/* Divider */}
      <div className="h-px" style={{ background: 'var(--border)' }} />

      {/* Meal Planner */}
      <section>
        <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--muted-foreground)' }}>
          {t('nutrition.meal_planner')}
        </p>
        <MealPlanner foodLog={foodLog} interactive={isToday} onAddMeal={handleAddMeal} />
      </section>

      {/* Log a Meal */}
      {isToday && (
        <section ref={loggerRef}>
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--muted-foreground)' }}>
            {t('nutrition.log_meal')}
          </p>
          <FoodLogger onLogged={handleLogged} meal={loggerMeal} onMealChange={setLoggerMeal} />
        </section>
      )}
```

- [ ] **Step 3: Replace the old food-log section with the RecipeBrowser**

The old `AnimatePresence`-wrapped "Today's Log" `motion.section` (the block that maps `MEAL_ORDER` into grouped entries) is now redundant — the MealPlanner shows per-meal entries. Delete that entire trailing `<AnimatePresence>…</AnimatePresence>` block (from `{/* Food Log */}` to its closing `</AnimatePresence>`) and replace it with the recipes section:

```tsx
      {/* Recipes */}
      <div className="h-px" style={{ background: 'var(--border)' }} />
      <section>
        <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--muted-foreground)' }}>
          {t('nutrition.recipes_heading')}
        </p>
        <RecipeBrowser />
      </section>
```

- [ ] **Step 4: Widen the page container**

The page wrapper is `max-w-lg`; recipes need more width. Change the outer div:
```tsx
    <div className="max-w-lg mx-auto px-1 py-2 space-y-8">
```
to:
```tsx
    <div className="max-w-3xl mx-auto px-1 py-2 space-y-8">
```

- [ ] **Step 5: Remove now-unused code**

The `MACRO_ACCENT` constant and the `MEAL_ORDER` import are now only used if still referenced. After Step 3 the page no longer renders the grouped food log, so `MACRO_ACCENT` and `MEAL_ORDER` may be unused. Remove `MACRO_ACCENT` if unused, and drop `MEAL_ORDER` from the `@/lib/nutrition-meal` import if unused (keep `MealType`, `mealFromTime`). Let lint confirm.

- [ ] **Step 6: Lint + build**

Run: `npm run lint`
Expected: no errors.
Run: `npm run build`
Expected: build succeeds (no type errors).

- [ ] **Step 7: Commit**

```bash
git add app/(dashboard)/nutrition/page.tsx
git commit -m "feat(nutrition): merge recipes + meal planner into nutrition page"
```

---

### Task 7: Redirect /recipes and drop the sidebar link

**Files:**
- Modify: `app/(dashboard)/recipes/page.tsx`
- Modify: `components/shared/DashboardSidebar.tsx`

**Interfaces:**
- Consumes: Next.js `redirect` from `next/navigation`.
- Produces: `/recipes` server-redirects to `/nutrition`; sidebar shows no Recipes entry.

- [ ] **Step 1: Read the Next redirect guidance**

Read the relevant routing/redirect section under `node_modules/next/dist/docs/` to confirm the redirect API for this Next version before editing.

- [ ] **Step 2: Replace the recipes page with a redirect**

Replace the ENTIRE contents of `app/(dashboard)/recipes/page.tsx` with:

```tsx
import { redirect } from 'next/navigation'

export default function RecipesPage() {
  redirect('/nutrition')
}
```

- [ ] **Step 3: Remove the Recipes link from the sidebar**

In `components/shared/DashboardSidebar.tsx`, delete the line:
```tsx
    { href: '/recipes',   labelKey: 'nav.recipes',   icon: ChefHat },
```
Then remove `ChefHat` from the `lucide-react` import on line 4 (it is now unused).

- [ ] **Step 4: Lint + build**

Run: `npm run lint`
Expected: no errors (no unused `ChefHat`).
Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/recipes/page.tsx components/shared/DashboardSidebar.tsx
git commit -m "feat(recipes): redirect /recipes to merged /nutrition, drop sidebar link"
```

---

### Task 8: Manual verification

**Files:** none (verification only).

- [ ] **Step 1: Run the dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify the merged page**

Open `/nutrition`. Confirm, top to bottom: calorie ring + macro bars; weekly chart; **Meal Planner** with 4 slots (breakfast/lunch/dinner/snack) showing time ranges and either logged entries or "Empty"; food logger; recipes (featured banner, lens tabs, pills, grouped cards).

- [ ] **Step 3: Verify slot interaction**

Click a meal slot's `+`. Confirm the page scrolls to the food logger and that meal is preselected in the MealChips. Log a food item and confirm it appears under the right planner slot.

- [ ] **Step 4: Verify routing + nav**

Visit `/recipes` → redirects to `/nutrition`. Visit a recipe card → `/recipes/<id>` detail still opens. Confirm the sidebar no longer shows a Recipes item, and Nutrition is highlighted on `/nutrition`.

- [ ] **Step 5: Verify Georgian locale**

Switch language to Georgian. Confirm planner heading, slot "ცარიელია", and snack "დღის განმავლობაში" render.

---

## Self-Review Notes

- **Spec coverage:** Header/macro/weekly (Task 6 reuse) ✓; MealPlanner (Tasks 1,3,6) ✓; FoodLogger slot wiring (Tasks 5,6) ✓; RecipeBrowser (Tasks 4,6) ✓; redirect + sidebar (Task 7) ✓; i18n (Task 2) ✓; `MEAL_TIME_RANGES` (Task 1) ✓.
- **Placeholders:** none — every code step shows full content.
- **Type consistency:** `MealPlannerProps`, `FoodLoggerProps`, `MEAL_TIME_RANGES: Record<MealType,string|null>`, `RecipeBrowser()` no-arg, `handleAddMeal(m: MealType)` consistent across tasks.
- **Test reality:** only Task 1 is unit-testable under the existing vitest config; component tasks verified by lint/build/manual per Global Constraints.
