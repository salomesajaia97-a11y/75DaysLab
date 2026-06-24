# Nutrition UX Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add meal categories, AI photo scan, and weekly history to the `/nutrition` page, woven into the existing design language.

**Architecture:** Extends existing nutrition files only — no new subsystems. A `meal` field on `FoodLog` drives grouped logging; a vision-model call behind a new `/scan` route powers photo logging; a 7-day Mongo aggregation feeds a Framer Motion bar chart with day-selection wired into the existing single-day fetch.

**Tech Stack:** Next.js 16.2.6 (App Router), MongoDB/Mongoose, Tailwind v4, Framer Motion, OpenRouter (OpenAI SDK), Cloudinary, i18n via `useLanguage()`/`t()`.

## Global Constraints

- **No test runner exists** in this repo. Verification = `npx tsc --noEmit` (typecheck), `npm run lint`, `npm run build`, plus explicit manual browser checks. Do NOT add a test framework — it is out of scope.
- **Next.js 16 breaking changes:** dynamic route params are async (`await params`); auth via `const session = await auth()` from `@/lib/auth` (never `getServerSession`); dashboard routes are bare paths.
- **All user-facing strings** go through `t('...')` with both Georgian and English keys added to the i18n source.
- **AI is OpenRouter** via `openRouterClient` in `lib/ai.ts` — not OpenAI direct. Free models only unless told otherwise.
- **Never auto-save** a photo-scanned entry — user confirms in the logger first.
- Follow existing style: CSS vars (`var(--foreground)`, `var(--border)`, `var(--muted-foreground)`), Fraunces serif headers, macro accents `#c07c5e`/`#c5a55a`/`#7a9e7e`.

---

### Task 1: Meal types + time heuristic

**Files:**
- Create: `lib/nutrition-meal.ts`
- Modify: `types/index.ts:39-48` (FoodEntry)

**Interfaces:**
- Produces: `type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'`; `mealFromTime(d: Date): MealType`; `MEAL_ORDER: MealType[]`. `FoodEntry` gains `meal: MealType`.

- [ ] **Step 1: Create the heuristic + type**

`lib/nutrition-meal.ts`:
```ts
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

/** Suggest a meal from the hour of `d`: <11 breakfast, 11–15 lunch, 16–21 dinner, else snack. */
export function mealFromTime(d: Date): MealType {
  const h = d.getHours()
  if (h < 11) return 'breakfast'
  if (h < 16) return 'lunch'
  if (h <= 21) return 'dinner'
  return 'snack'
}
```

- [ ] **Step 2: Add `meal` to FoodEntry**

In `types/index.ts`, import-free addition — add the field to `FoodEntry`:
```ts
export interface FoodEntry {
  id: string
  description: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  loggedAt: string
  photoUrl?: string
  meal: import('@/lib/nutrition-meal').MealType
}
```

- [ ] **Step 3: Verify the boundary logic by inspection + typecheck**

Confirm by reading: `new Date(setHours(10))→breakfast`, `11→lunch`, `15→lunch`, `16→dinner`, `21→dinner`, `22→snack`. Then run:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**
```bash
git add lib/nutrition-meal.ts types/index.ts
git commit -m "feat(nutrition): add MealType + mealFromTime heuristic"
```

---

### Task 2: FoodLog model gains `meal`

**Files:**
- Modify: `models/FoodLog.ts:3-25`

**Interfaces:**
- Consumes: `MealType` (Task 1).
- Produces: `IFoodLog.meal: MealType` persisted with enum + default `'snack'`.

- [ ] **Step 1: Add field to interface + schema**

In `models/FoodLog.ts` add to `IFoodLog`: `meal: 'breakfast' | 'lunch' | 'dinner' | 'snack'` and to the schema (after `fatG`):
```ts
meal: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack'], default: 'snack' },
```

- [ ] **Step 2: Typecheck**
```bash
npx tsc --noEmit
```
Expected: no errors. (Old docs without `meal` read back as `snack` via default on new writes; existing reads tolerate missing field.)

- [ ] **Step 3: Commit**
```bash
git add models/FoodLog.ts
git commit -m "feat(nutrition): add meal enum to FoodLog model"
```

---

### Task 3: Nutrition API accepts/returns meal + photoUrl

**Files:**
- Modify: `app/api/nutrition/route.ts:27-48`

**Interfaces:**
- Consumes: `mealFromTime` (Task 1), `IFoodLog.meal` (Task 2).
- Produces: POST stores `meal` (defaulting server-side via `mealFromTime(new Date())`) and `photoUrl`. GET already returns full docs (now including `meal`).

- [ ] **Step 1: Update POST handler**

Replace the POST body destructure + create in `app/api/nutrition/route.ts`:
```ts
import { mealFromTime, type MealType } from '@/lib/nutrition-meal'
// ...
const { description, calories, proteinG, carbsG, fatG, meal, photoUrl } = body
if (!description) return NextResponse.json({ error: 'Description required' }, { status: 400 })

await connectDB()
const now = new Date()
const date = now.toISOString().split('T')[0]
const validMeals: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
const resolvedMeal: MealType = validMeals.includes(meal) ? meal : mealFromTime(now)

const log = await FoodLog.create({
  userId: session.user.id,
  date,
  description,
  calories: calories ?? 0,
  proteinG: proteinG ?? 0,
  carbsG: carbsG ?? 0,
  fatG: fatG ?? 0,
  meal: resolvedMeal,
  photoUrl: photoUrl || undefined,
})
```

- [ ] **Step 2: Typecheck + lint**
```bash
npx tsc --noEmit && npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**
```bash
git add app/api/nutrition/route.ts
git commit -m "feat(nutrition): persist meal + photoUrl on food log POST"
```

---

### Task 4: Meal selector chips component

**Files:**
- Create: `components/nutrition/MealChips.tsx`

**Interfaces:**
- Consumes: `MealType`, `MEAL_ORDER` (Task 1); `t` from `useLanguage` (Task 9 adds keys — use keys `nutrition.meal_breakfast` etc. now).
- Produces: `<MealChips value={MealType} onChange={(m: MealType) => void} />`.

- [ ] **Step 1: Create the component**

`components/nutrition/MealChips.tsx`:
```tsx
'use client'
import { MEAL_ORDER, type MealType } from '@/lib/nutrition-meal'
import { useLanguage } from '@/lib/i18n'

interface MealChipsProps {
  value: MealType
  onChange: (m: MealType) => void
}

export function MealChips({ value, onChange }: MealChipsProps) {
  const { t } = useLanguage()
  return (
    <div className="flex gap-2 mb-3">
      {MEAL_ORDER.map(m => {
        const active = m === value
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className="flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200"
            style={{
              background: active ? 'var(--foreground)' : 'var(--muted)',
              color: active ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
            }}
          >
            {t(`nutrition.meal_${m}`)}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**
```bash
npx tsc --noEmit
```
Expected: no errors (i18n keys resolve to the raw key string until Task 9 — acceptable mid-build).

- [ ] **Step 3: Commit**
```bash
git add components/nutrition/MealChips.tsx
git commit -m "feat(nutrition): meal selector chips component"
```

---

### Task 5: Vision photo parsing in lib/ai.ts

**Files:**
- Modify: `lib/ai.ts` (append new function; reuse `parseMacros`, `openRouterClient`)

**Interfaces:**
- Consumes: existing `openRouterClient`, `parseMacros`, `MacroData`.
- Produces: `parseFoodPhoto(imageUrl: string): Promise<MacroData | null>`.

- [ ] **Step 1: Add the vision function**

Append to `lib/ai.ts`:
```ts
const VISION_MODEL = 'meta-llama/llama-3.2-11b-vision-instruct:free'

const PHOTO_SYSTEM = `You are a nutrition vision estimator. Look at the food photo and estimate its nutrition for the full portion shown.
Reply with ONLY this tag and nothing else:
<macros>{"calories":0,"proteinG":0,"carbsG":0,"fatG":0,"food":"short description"}</macros>
Use realistic estimates. If the image is not food, set all numbers to 0 and food to "not food".`

export async function parseFoodPhoto(imageUrl: string): Promise<MacroData | null> {
  try {
    const completion = await openRouterClient.chat.completions.create({
      model: VISION_MODEL,
      max_tokens: 256,
      messages: [
        { role: 'system', content: PHOTO_SYSTEM },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Estimate the nutrition of this food.' },
            { type: 'image_url', image_url: { url: imageUrl } },
          ] as never,
        },
      ],
    })
    const raw = completion.choices[0]?.message?.content ?? ''
    const { macros } = parseMacros(raw)
    if (!macros || macros.food === 'not food') return null
    return macros
  } catch (err) {
    console.error('[parseFoodPhoto]', err instanceof Error ? err.message : String(err))
    return null
  }
}
```

- [ ] **Step 2: Typecheck + lint**
```bash
npx tsc --noEmit && npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**
```bash
git add lib/ai.ts
git commit -m "feat(nutrition): add vision food photo macro estimator"
```

---

### Task 6: Photo scan API route

**Files:**
- Create: `app/api/nutrition/scan/route.ts`

**Interfaces:**
- Consumes: `auth`, `uploadPhoto` (`lib/cloudinary.ts`), `parseFoodPhoto` (Task 5).
- Produces: POST (multipart `image`) → `{ photoUrl: string, macros: MacroData | null }`.

- [ ] **Step 1: Create the route**

`app/api/nutrition/scan/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { uploadPhoto } from '@/lib/cloudinary'
import { parseFoodPhoto } from '@/lib/ai'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('image')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Image required' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  let photoUrl: string
  try {
    const up = await uploadPhoto(buffer, 'foodlogs')
    photoUrl = up.url
  } catch (err) {
    console.error('[nutrition/scan] upload', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Upload failed' }, { status: 502 })
  }

  const macros = await parseFoodPhoto(photoUrl)
  return NextResponse.json({ photoUrl, macros })
}
```

- [ ] **Step 2: Typecheck + lint**
```bash
npx tsc --noEmit && npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**
```bash
git add app/api/nutrition/scan/route.ts
git commit -m "feat(nutrition): photo scan route (upload + vision estimate)"
```

---

### Task 7: Wire FoodLogger — meal chips + photo scan + photoUrl passthrough

**Files:**
- Modify: `components/nutrition/FoodLogger.tsx`

**Interfaces:**
- Consumes: `MealChips` (Task 4), `mealFromTime`/`MealType` (Task 1), `/api/nutrition/scan` (Task 6).
- Produces: `onLogged(entry)` now carries `meal`; POST body includes `meal` + `photoUrl`.

- [ ] **Step 1: Add state — meal, photoUrl, scanning**

In `FoodLogger.tsx`, add imports and state:
```tsx
import { MealChips } from './MealChips'
import { mealFromTime, type MealType } from '@/lib/nutrition-meal'
// inside component:
const [meal, setMeal] = useState<MealType>(() => mealFromTime(new Date()))
const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined)
const [scanning, setScanning] = useState(false)
```

- [ ] **Step 2: Add the scan handler + file onChange**

Add handler and wire the existing `fileRef` input:
```tsx
async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
  const f = e.target.files?.[0]
  if (!f) return
  setScanning(true); setError(null)
  try {
    const fd = new FormData()
    fd.append('image', f)
    const res = await fetch('/api/nutrition/scan', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    setPhotoUrl(data.photoUrl)
    if (data.macros) {
      setDescription(data.macros.food || 'Scanned meal')
    } else {
      setError("Couldn't read the photo — describe it instead.")
    }
  } catch {
    setError('Photo scan failed. Try again or describe it.')
  } finally {
    setScanning(false)
    e.target.value = ''
  }
}
```
Change the hidden input to `<input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />` and the scan button to show `scanning` state (disable + swap label to a spinner like the Log button uses `Loader2`).

- [ ] **Step 3: Render MealChips + send meal/photoUrl**

Render `<MealChips value={meal} onChange={setMeal} />` above the textarea wrapper. In `logFood`, add `meal` and `photoUrl` to the `/api/nutrition` POST body and to the `entry` object passed to `onLogged`. After successful log, reset `setPhotoUrl(undefined)` and `setMeal(mealFromTime(new Date()))`.

- [ ] **Step 4: Typecheck + lint + build**
```bash
npx tsc --noEmit && npm run lint && npm run build
```
Expected: build succeeds.

- [ ] **Step 5: Commit**
```bash
git add components/nutrition/FoodLogger.tsx
git commit -m "feat(nutrition): meal chips + working photo scan in FoodLogger"
```

---

### Task 8: Weekly aggregation API + WeeklyChart

**Files:**
- Create: `app/api/nutrition/week/route.ts`
- Create: `components/nutrition/WeeklyChart.tsx`

**Interfaces:**
- Consumes: `auth`, `FoodLog`, `getProfile`/`calculateMacros` pattern (target computed client-side; route returns calories only — target merged in the page).
- Produces: GET `/api/nutrition/week` → `{ days: { date: string; calories: number }[] }` (7 entries, oldest→newest, today last). `<WeeklyChart days={...} target={number} selected={string} onSelectDay={(d:string)=>void} />`.

- [ ] **Step 1: Create aggregation route**

`app/api/nutrition/week/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { FoodLog } from '@/models/FoodLog'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const dates: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }

  const rows = await FoodLog.aggregate([
    { $match: { userId: session.user.id, date: { $in: dates } } },
    { $group: { _id: '$date', calories: { $sum: '$calories' } } },
  ])
  const byDate = new Map<string, number>(rows.map(r => [r._id as string, r.calories as number]))
  const days = dates.map(date => ({ date, calories: byDate.get(date) ?? 0 }))

  return NextResponse.json({ days })
}
```
Note: `userId` in `$match` must match the stored type. FoodLog stores `userId` as ObjectId — convert: `import mongoose from 'mongoose'` and use `new mongoose.Types.ObjectId(session.user.id)` in `$match`.

- [ ] **Step 2: Create WeeklyChart**

`components/nutrition/WeeklyChart.tsx`:
```tsx
'use client'
import { motion } from 'framer-motion'

interface Day { date: string; calories: number }
interface WeeklyChartProps {
  days: Day[]
  target: number
  selected: string
  onSelectDay: (date: string) => void
}

export function WeeklyChart({ days, target, selected, onSelectDay }: WeeklyChartProps) {
  const max = Math.max(target, ...days.map(d => d.calories), 1)
  return (
    <div className="flex items-end justify-between gap-2 h-32">
      {days.map((d, i) => {
        const pct = d.calories / max
        const over = d.calories > target && target > 0
        const isSel = d.date === selected
        const label = new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })
        return (
          <button
            key={d.date}
            type="button"
            onClick={() => onSelectDay(d.date)}
            className="flex flex-col items-center gap-1.5 flex-1 h-full justify-end"
          >
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(pct * 100, 3)}%` }}
              transition={{ duration: 0.9, delay: i * 0.05, ease: [0.34, 1.05, 0.64, 1] }}
              className="w-full rounded-t-md"
              style={{
                background: over ? '#c07c5e' : 'var(--foreground)',
                opacity: isSel ? 1 : 0.45,
              }}
            />
            <span className="text-[10px] font-medium" style={{ color: isSel ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Typecheck + lint**
```bash
npx tsc --noEmit && npm run lint
```
Expected: no errors.

- [ ] **Step 4: Commit**
```bash
git add app/api/nutrition/week/route.ts components/nutrition/WeeklyChart.tsx
git commit -m "feat(nutrition): weekly calorie aggregation + bar chart"
```

---

### Task 9: Nutrition page — grouped log, weekly chart, day selection

**Files:**
- Modify: `app/(dashboard)/nutrition/page.tsx`

**Interfaces:**
- Consumes: `WeeklyChart` (Task 8), `MEAL_ORDER`/`MealType` (Task 1), `FoodEntry.meal` (Task 1).
- Produces: meal-grouped log UI; `selectedDate` state driving the existing `/api/nutrition?date=` fetch; weekly chart between dashboard and logger.

- [ ] **Step 1: Add selectedDate + week state**

Add `const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])` and `const [week, setWeek] = useState<{date:string;calories:number}[]>([])`. Extract the day-fetch into a `loadDay(date)` callback that sets `foodLog` + `consumed`; call it on mount and whenever `selectedDate` changes. Fetch `/api/nutrition/week` once on mount into `week`.

- [ ] **Step 2: Map `meal` into FoodEntry**

In the GET mapping, add `meal: l.meal ?? 'snack'` to each entry.

- [ ] **Step 3: Render WeeklyChart + viewing-day pill**

Between the Daily Macros section and the divider, add a section: header `t('nutrition.this_week')`, `<WeeklyChart days={week} target={targets.calories} selected={selectedDate} onSelectDay={setSelectedDate} />`. When `selectedDate !== today`, show a small pill with the date + a "back to today" button that resets `selectedDate`.

- [ ] **Step 4: Group the log by meal**

Replace the flat `foodLog.map` with: for each `m of MEAL_ORDER`, filter entries where `entry.meal === m`; skip empty groups; render a section header with `t(\`nutrition.meal_${m}\`)` + summed kcal, then the existing row markup for that group's entries. Add a small thumbnail `<img src={entry.photoUrl}>` (rounded, ~36px) in the row when `entry.photoUrl` is set.

- [ ] **Step 5: Typecheck + lint + build**
```bash
npx tsc --noEmit && npm run lint && npm run build
```
Expected: build succeeds.

- [ ] **Step 6: Commit**
```bash
git add "app/(dashboard)/nutrition/page.tsx"
git commit -m "feat(nutrition): meal-grouped log, weekly chart, day selection"
```

---

### Task 10: i18n keys (Georgian + English)

**Files:**
- Modify: i18n source in `lib/i18n` (locate the translations object — add keys to both `ka` and `en`)

**Interfaces:**
- Produces: keys `nutrition.meal_breakfast/lunch/dinner/snack`, `nutrition.this_week`, `nutrition.viewing_day`, `nutrition.back_to_today`, `nutrition.scan_failed`.

- [ ] **Step 1: Inspect the i18n structure**

Read `lib/i18n` (or `lib/i18n.ts` / `lib/i18n/index.ts`) to find the existing `nutrition.*` keys and the en/ka object shape. Match it exactly.

- [ ] **Step 2: Add keys to both languages**

English values: Breakfast / Lunch / Dinner / Snack / "This Week" / "Viewing {date}" / "Back to today" / "Couldn't read the photo — describe it instead."
Georgian values: საუზმე / სადილი / ვახშამი / ნაყინი→use "სნექი" / "ეს კვირა" / "ნახვა: {date}" / "დღევანდელზე დაბრუნება" / "ფოტო ვერ წავიკითხე — აღწერე ტექსტით."
(Use the exact key-nesting style already present.)

- [ ] **Step 3: Typecheck + build + manual verify**
```bash
npx tsc --noEmit && npm run build
```
Then run `npm run dev`, open `/nutrition`, switch language, confirm meal headers, chart label, and chips render translated.

- [ ] **Step 4: Commit**
```bash
git add lib/i18n
git commit -m "feat(nutrition): i18n keys for meals, weekly view, scan errors"
```

---

### Task 11: Manual end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Run the app**
```bash
npm run dev
```

- [ ] **Step 2: Walk the flows**
- Log text food → confirm it lands under the time-appropriate meal section with correct kcal subtotal.
- Change a meal chip before logging → entry lands under the chosen meal.
- Tap "scan photo", pick a food image → description pre-fills, photo thumbnail shows after logging; on a non-food image, see the fallback error and text entry still works.
- Weekly chart shows 7 bars; today highlighted; tap a past day → ring + log switch to that day; "back to today" resets.
- Switch language → all new strings translate.

- [ ] **Step 3: Final build gate**
```bash
npm run build
```
Expected: clean build. Fix any type/lint errors before declaring done.

---

## Notes for the implementer
- `OPENROUTER_API_KEY`, `CLOUDINARY_*` must be set in `.env.local` for scan to work end-to-end. If Cloudinary creds are absent, the scan route returns 502 — the UI already falls back to text entry, so the rest of the plan is still testable.
- If `meta-llama/llama-3.2-11b-vision-instruct:free` is unavailable on OpenRouter, swap `VISION_MODEL` for another free vision model (e.g. `qwen/qwen-2-vl-7b-instruct:free`) — single-line change in `lib/ai.ts`.
- `recharts` is already a dependency if a richer chart is ever wanted, but the hand-rolled Framer Motion bars match the existing MacroDashboard aesthetic — keep them.
