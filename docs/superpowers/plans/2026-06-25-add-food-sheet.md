# Add-Food Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tapping **+** on a meal card opens a bottom sheet to add food (text / camera / gallery / favorites); the food's macros are estimated, saved to that meal, and the daily rings + per-macro "remaining" update live.

**Architecture:** Extract the existing scan + AI-estimate + save fetch logic out of `FoodLogger` into a `useFoodLogging` hook. A new `AddFoodSheet` bottom-sheet component consumes the hook and presents a method picker → input panel → macro preview → confirm. Favorites are derived (no new DB model) from the user's `FoodLog` history via a pure `aggregateFavorites` function behind a new GET route. The nutrition page opens the sheet per meal and feeds logged entries into existing live-totals state.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Mongoose, framer-motion, lucide-react, vitest (node env).

## Global Constraints

- This is NOT stock Next.js — consult `node_modules/next/dist/docs/` before using any Next API you're unsure of.
- Vitest runs **node** environment and only includes `lib/**/*.test.ts` (see `vitest.config.ts`). Unit tests MUST live in `lib/` and test pure functions only — no component/DOM tests.
- All user-facing strings go through `useLanguage()`'s `t(key)`; add keys to BOTH `locales/ge.json` and `locales/en.json`.
- `MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'` (from `lib/nutrition-meal.ts`).
- Macro shape everywhere: `{ calories, proteinG, carbsG, fatG }` (numbers). `FoodEntry` adds `id, description, loggedAt, meal, photoUrl?`.
- Save endpoint: `POST /api/nutrition` body `{ description, calories, proteinG, carbsG, fatG, meal, photoUrl? }` → returns the created log (has `_id`). It resolves/validates `meal` server-side and stamps `date`.
- Work on `main`, commit frequently. Do NOT push unless asked.

---

### Task 1: Favorites aggregation (pure function + test)

**Files:**
- Create: `lib/favorites.ts`
- Test: `lib/favorites.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface FavoriteFood { description: string; calories: number; proteinG: number; carbsG: number; fatG: number; count: number; lastLoggedAt: string }`
  - `interface FavoriteSourceLog { description: string; calories?: number; proteinG?: number; carbsG?: number; fatG?: number; loggedAt?: string | Date }`
  - `function aggregateFavorites(logs: FavoriteSourceLog[], limit?: number): FavoriteFood[]`
    Groups by case-insensitive trimmed `description`; `count` = number of logs in group; macros + `lastLoggedAt` taken from the **most recently logged** row in the group; result sorted by `count` desc then `lastLoggedAt` desc; sliced to `limit` (default 20). Blank/whitespace descriptions are skipped.

- [ ] **Step 1: Write the failing test**

Create `lib/favorites.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { aggregateFavorites } from './favorites'

describe('aggregateFavorites', () => {
  it('groups by normalized description and counts occurrences', () => {
    const out = aggregateFavorites([
      { description: 'Oatmeal', calories: 300, proteinG: 10, carbsG: 50, fatG: 5, loggedAt: '2026-06-20T08:00:00Z' },
      { description: ' oatmeal ', calories: 320, proteinG: 11, carbsG: 52, fatG: 6, loggedAt: '2026-06-22T08:00:00Z' },
      { description: 'Eggs', calories: 150, proteinG: 12, carbsG: 1, fatG: 10, loggedAt: '2026-06-21T08:00:00Z' },
    ])
    expect(out).toHaveLength(2)
    const oat = out.find(f => f.description.toLowerCase().trim() === 'oatmeal')!
    expect(oat.count).toBe(2)
    // macros come from the most recent row in the group
    expect(oat.calories).toBe(320)
    expect(oat.lastLoggedAt).toBe('2026-06-22T08:00:00.000Z')
  })

  it('orders by count desc then recency, and respects limit', () => {
    const out = aggregateFavorites(
      [
        { description: 'A', loggedAt: '2026-06-01T00:00:00Z' },
        { description: 'B', loggedAt: '2026-06-10T00:00:00Z' },
        { description: 'B', loggedAt: '2026-06-11T00:00:00Z' },
        { description: 'C', loggedAt: '2026-06-12T00:00:00Z' },
      ],
      2,
    )
    expect(out.map(f => f.description)).toEqual(['B', 'C'])
  })

  it('skips blank descriptions and defaults missing macros to 0', () => {
    const out = aggregateFavorites([
      { description: '   ', calories: 100, loggedAt: '2026-06-01T00:00:00Z' },
      { description: 'Soup', loggedAt: '2026-06-02T00:00:00Z' },
    ])
    expect(out).toHaveLength(1)
    expect(out[0].description).toBe('Soup')
    expect(out[0]).toMatchObject({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/favorites.test.ts`
Expected: FAIL — cannot resolve `./favorites` / `aggregateFavorites is not a function`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/favorites.ts`:

```ts
export interface FavoriteFood {
  description: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  count: number
  lastLoggedAt: string
}

export interface FavoriteSourceLog {
  description: string
  calories?: number
  proteinG?: number
  carbsG?: number
  fatG?: number
  loggedAt?: string | Date
}

function ts(v: string | Date | undefined): string {
  if (!v) return new Date(0).toISOString()
  return (v instanceof Date ? v : new Date(v)).toISOString()
}

export function aggregateFavorites(logs: FavoriteSourceLog[], limit = 20): FavoriteFood[] {
  const groups = new Map<string, FavoriteFood>()

  for (const log of logs) {
    const desc = (log.description ?? '').trim()
    if (!desc) continue
    const key = desc.toLowerCase()
    const at = ts(log.loggedAt)
    const existing = groups.get(key)

    if (!existing) {
      groups.set(key, {
        description: desc,
        calories: log.calories ?? 0,
        proteinG: log.proteinG ?? 0,
        carbsG: log.carbsG ?? 0,
        fatG: log.fatG ?? 0,
        count: 1,
        lastLoggedAt: at,
      })
      continue
    }

    existing.count += 1
    if (at >= existing.lastLoggedAt) {
      // newest row wins for the displayed name + macros
      existing.description = desc
      existing.calories = log.calories ?? 0
      existing.proteinG = log.proteinG ?? 0
      existing.carbsG = log.carbsG ?? 0
      existing.fatG = log.fatG ?? 0
      existing.lastLoggedAt = at
    }
  }

  return [...groups.values()]
    .sort((a, b) => (b.count - a.count) || b.lastLoggedAt.localeCompare(a.lastLoggedAt))
    .slice(0, limit)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/favorites.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/favorites.ts lib/favorites.test.ts
git commit -m "feat(nutrition): add favorites aggregation helper"
```

---

### Task 2: Favorites API route

**Files:**
- Create: `app/api/nutrition/favorites/route.ts`

**Interfaces:**
- Consumes: `aggregateFavorites`, `FavoriteFood` from `lib/favorites.ts`; `auth` from `@/lib/auth`; `connectDB` from `@/lib/mongoose`; `FoodLog` from `@/models/FoodLog`.
- Produces: `GET /api/nutrition/favorites` → `{ favorites: FavoriteFood[] }` (401 `{ error }` if unauthenticated).

- [ ] **Step 1: Write the route**

Create `app/api/nutrition/favorites/route.ts` (mirror auth/connect pattern from `app/api/nutrition/route.ts:7-13`):

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { FoodLog } from '@/models/FoodLog'
import { aggregateFavorites } from '@/lib/favorites'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  // Pull recent history (cap rows so this stays cheap), newest first.
  const logs = await FoodLog.find({ userId: session.user.id })
    .sort({ loggedAt: -1 })
    .limit(200)
    .lean()

  const favorites = aggregateFavorites(
    logs.map(l => ({
      description: l.description,
      calories: l.calories,
      proteinG: l.proteinG,
      carbsG: l.carbsG,
      fatG: l.fatG,
      loggedAt: l.loggedAt,
    })),
  )

  return NextResponse.json({ favorites })
}
```

- [ ] **Step 2: Verify it compiles / lints**

Run: `npx eslint app/api/nutrition/favorites/route.ts`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/nutrition/favorites/route.ts
git commit -m "feat(nutrition): GET /api/nutrition/favorites from log history"
```

---

### Task 3: `useFoodLogging` hook (extract estimate / scan / save)

**Files:**
- Create: `components/nutrition/useFoodLogging.ts`

**Interfaces:**
- Consumes: `FoodEntry` from `@/types`; `MealType` from `@/lib/nutrition-meal`. Macro endpoints `/api/ai/chat` (mode `food_log`) and `/api/nutrition/scan` and `/api/nutrition` (see Global Constraints).
- Produces:
  - `interface Macros { calories: number; proteinG: number; carbsG: number; fatG: number; food?: string }`
  - `interface UseFoodLogging { loading: boolean; scanning: boolean; error: string | null; clearError(): void; estimateText(text: string): Promise<Macros>; scanPhoto(file: File): Promise<{ macros: Macros | null; photoUrl?: string }>; save(input: { description: string; macros: Macros; meal: MealType; photoUrl?: string }): Promise<FoodEntry | null> }`
  - `function useFoodLogging(): UseFoodLogging`

Note: the hook is meal-agnostic — `meal` is passed per `save()` call (the sheet already knows the target meal). `save()` returns the new `FoodEntry`; the caller is responsible for handing it to the page's `onLogged`.

- [ ] **Step 1: Write the hook**

Create `components/nutrition/useFoodLogging.ts`:

```ts
'use client'
import { useState } from 'react'
import type { FoodEntry } from '@/types'
import type { MealType } from '@/lib/nutrition-meal'

export interface Macros {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  food?: string
}

const ZERO: Macros = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }

export interface UseFoodLogging {
  loading: boolean
  scanning: boolean
  error: string | null
  clearError(): void
  estimateText(text: string): Promise<Macros>
  scanPhoto(file: File): Promise<{ macros: Macros | null; photoUrl?: string }>
  save(input: { description: string; macros: Macros; meal: MealType; photoUrl?: string }): Promise<FoodEntry | null>
}

export function useFoodLogging(): UseFoodLogging {
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function estimateText(text: string): Promise<Macros> {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, mode: 'food_log' }),
    })
    const data = await res.json()
    return data.macros ?? { ...ZERO, food: text }
  }

  async function scanPhoto(file: File): Promise<{ macros: Macros | null; photoUrl?: string }> {
    setScanning(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/nutrition/scan', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return { macros: data.macros ?? null, photoUrl: data.photoUrl }
    } catch {
      setError('Photo scan failed. Try again or describe it.')
      return { macros: null }
    } finally {
      setScanning(false)
    }
  }

  async function save(input: {
    description: string
    macros: Macros
    meal: MealType
    photoUrl?: string
  }): Promise<FoodEntry | null> {
    const { description, macros, meal, photoUrl } = input
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          calories: macros.calories,
          proteinG: macros.proteinG,
          carbsG: macros.carbsG,
          fatG: macros.fatG,
          meal,
          photoUrl,
        }),
      })
      const saved = await res.json()
      if (!res.ok) throw new Error(saved.error)
      return {
        id: saved._id ?? Date.now().toString(),
        description,
        calories: macros.calories,
        proteinG: macros.proteinG,
        carbsG: macros.carbsG,
        fatG: macros.fatG,
        loggedAt: saved.loggedAt ?? new Date().toISOString(),
        meal,
        photoUrl,
      }
    } catch {
      setError('Failed to log food. Try again.')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { loading, scanning, error, clearError: () => setError(null), estimateText, scanPhoto, save }
}
```

- [ ] **Step 2: Verify it lints**

Run: `npx eslint components/nutrition/useFoodLogging.ts`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/nutrition/useFoodLogging.ts
git commit -m "feat(nutrition): extract useFoodLogging hook"
```

---

### Task 4: `AddFoodSheet` bottom-sheet component

**Files:**
- Create: `components/nutrition/AddFoodSheet.tsx`

**Interfaces:**
- Consumes: `useFoodLogging`, `Macros` from `./useFoodLogging`; `FavoriteFood` from `@/lib/favorites`; `MealType` from `@/lib/nutrition-meal`; `FoodEntry` from `@/types`; `useLanguage` from `@/lib/i18n`; icons from `lucide-react`; `motion, AnimatePresence` from `framer-motion`.
- Produces:
  - `interface AddFoodSheetProps { meal: MealType | null; open: boolean; onClose(): void; onLogged(entry: FoodEntry): void }`
  - `function AddFoodSheet(props: AddFoodSheetProps): JSX.Element | null`

Behavior:
- When `open` is false or `meal` is null → render `null`.
- Renders a fixed full-screen backdrop + bottom-anchored panel (slide-up via framer-motion), styled with the app's CSS vars (`--card`, `--border`, `--foreground`, `--muted-foreground`, `--background`).
- Internal state `view: 'menu' | 'text' | 'camera' | 'gallery' | 'favorites'` (starts `'menu'`); reset to `'menu'` each time `open` flips true.
- **menu** view: title `t('nutrition.add.title')`, close (X) button calling `onClose`, and 4 tiles using existing keys `recipes.add.{text,camera,gallery,favorites}` + `_desc`, icons `Type / Camera / ImageIcon / Star`, accent colors orange/blue/purple/green (match screenshot). Tapping a tile sets `view`.
- **text** view: textarea → "Estimate" button calls `estimateText` → shows a macro preview row (kcal / P / C / F) → "Log to <meal>" button calls `save` then `onLogged` + `onClose`.
- **camera** view: hidden `<input type="file" accept="image/*" capture="environment">`, auto-opened on entry; on file pick call `scanPhoto`, prefill description from `macros.food`, show preview, then same save/confirm as text. Keep the `photoUrl` from scan and pass to `save`.
- **gallery** view: identical to camera but `<input type="file" accept="image/*">` (no `capture`).
- **favorites** view: on entry `fetch('/api/nutrition/favorites')` → list rows (description + kcal); tapping a row calls `save({ description, macros: row, meal })` then `onLogged` + `onClose`. Empty/error state: short message.
- A back arrow in non-menu views returns to `'menu'`. Show `error` (from hook) inline. Disable confirm while `loading`/`scanning` or when there's nothing to log.

- [ ] **Step 1: Write the component**

Create `components/nutrition/AddFoodSheet.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, Type, Camera, Image as ImageIcon, Star, Loader2 } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import type { MealType } from '@/lib/nutrition-meal'
import type { FoodEntry } from '@/types'
import type { FavoriteFood } from '@/lib/favorites'
import { useFoodLogging, type Macros } from './useFoodLogging'

type View = 'menu' | 'text' | 'camera' | 'gallery' | 'favorites'

const TILES = [
  { view: 'text' as const,      key: 'text',      Icon: Type,      bg: '#fef0e6', fg: '#f97316' },
  { view: 'camera' as const,    key: 'camera',    Icon: Camera,    bg: '#e6effe', fg: '#3b82f6' },
  { view: 'gallery' as const,   key: 'gallery',   Icon: ImageIcon, bg: '#efe9fe', fg: '#8b5cf6' },
  { view: 'favorites' as const, key: 'favorites', Icon: Star,      bg: '#e7f7ec', fg: '#22c55e' },
]

const MACRO_ACCENT = { protein: '#c07c5e', carbs: '#c5a55a', fat: '#7a9e7e' }

export interface AddFoodSheetProps {
  meal: MealType | null
  open: boolean
  onClose(): void
  onLogged(entry: FoodEntry): void
}

export function AddFoodSheet({ meal, open, onClose, onLogged }: AddFoodSheetProps) {
  const { t } = useLanguage()
  const log = useFoodLogging()
  const [view, setView] = useState<View>('menu')
  const [description, setDescription] = useState('')
  const [macros, setMacros] = useState<Macros | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined)
  const [favorites, setFavorites] = useState<FavoriteFood[]>([])
  const [favLoading, setFavLoading] = useState(false)

  // Reset everything when the sheet (re)opens.
  useEffect(() => {
    if (open) {
      setView('menu'); setDescription(''); setMacros(null); setPhotoUrl(undefined)
      log.clearError()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Load favorites lazily when that view is opened.
  useEffect(() => {
    if (view !== 'favorites') return
    setFavLoading(true)
    fetch('/api/nutrition/favorites')
      .then(r => r.ok ? r.json() : null)
      .then(d => setFavorites(d?.favorites ?? []))
      .catch(() => setFavorites([]))
      .finally(() => setFavLoading(false))
  }, [view])

  if (!open || !meal) return null

  const mealLabel = t(`nutrition.meal_${meal}`)

  async function handleFile(file: File | undefined) {
    if (!file) return
    const { macros: m, photoUrl: url } = await log.scanPhoto(file)
    if (m) { setMacros(m); setDescription(m.food ?? 'Scanned meal'); setPhotoUrl(url) }
  }

  async function handleEstimate() {
    const text = description.trim()
    if (!text) return
    const m = await log.estimateText(text)
    setMacros(m)
  }

  async function commit(desc: string, m: Macros, url?: string) {
    if (!meal) return
    const entry = await log.save({ description: desc, macros: m, meal, photoUrl: url })
    if (entry) { onLogged(entry); onClose() }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-50 flex items-end justify-center"
        style={{ background: 'rgba(0,0,0,0.4)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-md rounded-t-3xl p-5 pb-8"
          style={{ background: 'var(--card)' }}
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
        >
          {/* header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              {view !== 'menu' && (
                <button type="button" onClick={() => { setView('menu'); log.clearError() }} aria-label="back">
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                {t('nutrition.add.title')}
              </h2>
            </div>
            <button
              type="button" onClick={onClose} aria-label="close"
              className="h-9 w-9 rounded-full flex items-center justify-center"
              style={{ background: 'var(--muted)' }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {view === 'menu' && (
            <div className="space-y-3">
              {TILES.map(({ view: v, key, Icon, bg, fg }) => (
                <button
                  key={key} type="button" onClick={() => setView(v)}
                  className="w-full flex items-center gap-4 rounded-2xl p-4 text-left transition-transform active:scale-[0.98]"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
                >
                  <span className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                    <Icon className="h-6 w-6" style={{ color: fg }} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{t(`recipes.add.${key}`)}</span>
                    <span className="block text-sm" style={{ color: 'var(--muted-foreground)' }}>{t(`recipes.add.${key}_desc`)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {(view === 'text' || view === 'camera' || view === 'gallery') && (
            <div className="space-y-4">
              {view === 'text' && (
                <textarea
                  rows={3} autoFocus value={description}
                  onChange={e => { setDescription(e.target.value); setMacros(null) }}
                  placeholder={t('nutrition.add.text_placeholder')}
                  className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                />
              )}

              {(view === 'camera' || view === 'gallery') && (
                <label
                  className="flex items-center justify-center gap-2 rounded-xl py-8 cursor-pointer text-sm"
                  style={{ background: 'var(--background)', border: '1px dashed var(--border)', color: 'var(--muted-foreground)' }}
                >
                  {log.scanning
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('nutrition.add.scanning')}</>
                    : <>{view === 'camera' ? <Camera className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />} {t(`recipes.add.${view}_desc`)}</>}
                  <input
                    type="file" accept="image/*" {...(view === 'camera' ? { capture: 'environment' as const } : {})}
                    className="hidden" onChange={e => handleFile(e.target.files?.[0])}
                  />
                </label>
              )}

              {view === 'text' && !macros && (
                <button
                  type="button" onClick={handleEstimate} disabled={!description.trim() || log.loading}
                  className="w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
                >
                  {log.loading && <Loader2 className="h-4 w-4 animate-spin" />} {t('nutrition.add.estimate')}
                </button>
              )}

              {macros && (
                <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
                  <p className="text-sm font-medium truncate">{description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-lg">{macros.calories} kcal</span>
                    <span>
                      <span style={{ color: MACRO_ACCENT.protein }}>P {macros.proteinG}g</span>{' · '}
                      <span style={{ color: MACRO_ACCENT.carbs }}>C {macros.carbsG}g</span>{' · '}
                      <span style={{ color: MACRO_ACCENT.fat }}>F {macros.fatG}g</span>
                    </span>
                  </div>
                  <button
                    type="button" onClick={() => commit(description.trim() || macros.food || 'Meal', macros, photoUrl)}
                    disabled={log.loading}
                    className="w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
                    style={{ background: 'var(--foreground)', color: 'var(--primary-foreground)' }}
                  >
                    {log.loading && <Loader2 className="h-4 w-4 animate-spin" />} {t('nutrition.add.log_to', { meal: mealLabel })}
                  </button>
                </div>
              )}

              {log.error && <p className="text-xs text-destructive">{log.error}</p>}
            </div>
          )}

          {view === 'favorites' && (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {favLoading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>}
              {!favLoading && favorites.length === 0 && (
                <p className="text-center text-sm py-6" style={{ color: 'var(--muted-foreground)' }}>{t('nutrition.add.no_favorites')}</p>
              )}
              {!favLoading && favorites.map(f => (
                <button
                  key={f.description + f.lastLoggedAt} type="button"
                  onClick={() => commit(f.description, f)}
                  disabled={log.loading}
                  className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-left"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium truncate">{f.description}</span>
                    <span className="block text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      P {f.proteinG}g · C {f.carbsG}g · F {f.fatG}g
                    </span>
                  </span>
                  <span className="text-sm font-semibold flex-shrink-0 ml-3">{f.calories} kcal</span>
                </button>
              ))}
              {log.error && <p className="text-xs text-destructive">{log.error}</p>}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Verify it lints / type-checks**

Run: `npx eslint components/nutrition/AddFoodSheet.tsx`
Expected: no errors. (If `capture` prop type complains, the `as const` cast in the spread resolves it.)

- [ ] **Step 3: Commit**

```bash
git add components/nutrition/AddFoodSheet.tsx
git commit -m "feat(nutrition): AddFoodSheet bottom sheet with 4 input methods"
```

---

### Task 5: i18n keys for the sheet

**Files:**
- Modify: `locales/ge.json` (after line 129, the `nutrition.recipes_heading` entry)
- Modify: `locales/en.json` (matching nutrition block)

**Interfaces:**
- Produces keys: `nutrition.add.title`, `nutrition.add.text_placeholder`, `nutrition.add.estimate`, `nutrition.add.scanning`, `nutrition.add.log_to` (uses `{meal}`), `nutrition.add.no_favorites`. (Method labels reuse existing `recipes.add.*`.)

- [ ] **Step 1: Add Georgian keys**

In `locales/ge.json`, add inside the `nutrition.*` block (e.g. right after `"nutrition.recipes_heading": "რეცეპტები",`):

```json
  "nutrition.add.title": "დაამატე საკვები",
  "nutrition.add.text_placeholder": "რა მიირთვი? მაგ: '2 კვერცხი და ავოკადო ტოსტი'",
  "nutrition.add.estimate": "გამოთვალე",
  "nutrition.add.scanning": "სკანირება…",
  "nutrition.add.log_to": "დაამატე — {meal}",
  "nutrition.add.no_favorites": "ჯერ ფავორიტები არ გაქვს. დაამატე საკვები და აქ გამოჩნდება.",
```

(Make sure the line you append after still has a trailing comma, and the new block's last line ends without a trailing comma only if it's the final key in the object — it is not here, so keep the comma.)

- [ ] **Step 2: Add English keys**

In `locales/en.json`, add the matching block in the nutrition section:

```json
  "nutrition.add.title": "Add food",
  "nutrition.add.text_placeholder": "What did you eat? e.g. '2 eggs with avocado toast'",
  "nutrition.add.estimate": "Estimate",
  "nutrition.add.scanning": "Scanning…",
  "nutrition.add.log_to": "Log to {meal}",
  "nutrition.add.no_favorites": "No favorites yet. Log some food and it'll show up here.",
```

- [ ] **Step 3: Verify both files are valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('locales/ge.json','utf8')); JSON.parse(require('fs').readFileSync('locales/en.json','utf8')); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 4: Commit**

```bash
git add locales/ge.json locales/en.json
git commit -m "feat(i18n): add nutrition.add.* keys for add-food sheet"
```

---

### Task 6: Wire the sheet into the nutrition page

**Files:**
- Modify: `app/(dashboard)/nutrition/page.tsx`

**Interfaces:**
- Consumes: `AddFoodSheet` from `@/components/nutrition/AddFoodSheet`; existing `handleLogged`, `MealType`.
- Produces: nothing new (UI behavior change).

- [ ] **Step 1: Confirm FoodLogger has no other consumers**

Run: `grep -rn "FoodLogger" app components --include=*.tsx`
Expected: only `app/(dashboard)/nutrition/page.tsx` imports/uses it. (If anything else does, leave `FoodLogger.tsx` on disk; otherwise it may be deleted in Step 5.)

- [ ] **Step 2: Replace import + add sheet state**

In `app/(dashboard)/nutrition/page.tsx`:
- Remove the import line `import { FoodLogger } from '@/components/nutrition/FoodLogger'` (line 5) and add `import { AddFoodSheet } from '@/components/nutrition/AddFoodSheet'`.
- Remove the now-unused `useRef` import usage and `loggerRef` (lines 30) and `loggerMeal`/`setLoggerMeal` state (line 29) **only if** no longer referenced after this task. Replace with:

```tsx
const [sheetMeal, setSheetMeal] = useState<MealType | null>(null)
```

- Replace `handleAddMeal` (lines 32-35) with:

```tsx
function handleAddMeal(m: MealType) {
  setSheetMeal(m)
}
```

- [ ] **Step 3: Replace the inline logger section with the sheet**

Remove the entire `{/* Log a Meal */}` block (lines 175-183). At the end of the page's returned JSX (just before the closing `</div>` of the root container, after the Recipes section), render the sheet:

```tsx
      <AddFoodSheet
        meal={sheetMeal}
        open={sheetMeal !== null}
        onClose={() => setSheetMeal(null)}
        onLogged={handleLogged}
      />
```

Keep `handleLogged` as-is — it already updates `consumed` + `foodLog`, which drives the rings and the per-macro "remaining" values. Note `handleLogged` early-returns unless `selectedDate === TODAY`; the **+** buttons only render when `interactive={isToday}`, so the sheet only opens for today — consistent.

- [ ] **Step 4: Verify lint + build**

Run: `npx eslint "app/(dashboard)/nutrition/page.tsx"`
Expected: no errors (no unused `useRef`/`FoodLogger`/`mealFromTime` left dangling — remove any import that becomes unused, e.g. `mealFromTime` if `loggerMeal` is gone).

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: (Optional) delete dead FoodLogger**

If Step 1 confirmed no other consumer:

```bash
git rm components/nutrition/FoodLogger.tsx
```

If `MealChips` is now unused too (`grep -rn "MealChips" app components --include=*.tsx`), remove it as well. Otherwise leave it.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(nutrition): open AddFoodSheet from meal + button"
```

---

### Task 7: Manual end-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Open the app, log in, go to the კვება (nutrition) tab.

- [ ] **Step 2: Verify each method for a specific meal**

For breakfast (საუზმე), tap **+**:
- Sheet slides up titled `დაამატე საკვები` with 4 tiles. ✅
- **ტექსტით:** type "2 eggs", tap Estimate → macro preview appears → tap "დაამატე — საუზმე" → sheet closes, entry appears under **breakfast** card, calories ring + carbs/fat/protein "remaining" decrease by the right amounts. ✅
- **გალერეა:** pick a food image → scan → preview → confirm → logged to breakfast. ✅
- **კამერა:** (on a device/emulator) capture → scan → confirm. On desktop without a camera, the file dialog opens — acceptable. ✅
- **ფავორიტები:** shows previously-logged distinct foods; tap one → logs instantly to breakfast, totals update. ✅

- [ ] **Step 3: Verify meal targeting**

Tap **+** on ვახშამი (dinner), log something, confirm it lands under **dinner**, not breakfast.

- [ ] **Step 4: Verify totals math**

Note the "მიღებული" (consumed) kcal and each macro's `N / Mგ`. After logging a known item, consumed increases and the remaining (target − consumed) reflected by the rings/bars is correct.

- [ ] **Step 5: Regression check**

Run: `npx vitest run`
Expected: all tests pass (including `lib/favorites.test.ts`).

---

## Self-Review notes

- **Spec coverage:** bottom sheet (T4), 4 methods text/camera/gallery/favorites (T4 + T2 + hook T3), macro preview before save (T4), live totals/remaining (T6 reuses existing `handleLogged`), favorites auto-from-history no new model (T1/T2), i18n (T5), page wiring + inline-logger removal (T6). All spec sections mapped.
- **Placeholders:** none — all code shown in full.
- **Type consistency:** `Macros`/`FoodEntry`/`MealType`/`FavoriteFood` names and shapes are consistent across T1–T6; `save()` returns `FoodEntry`, fed to page `onLogged(entry)`.
