# Workout Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dual 45-min workout tracker (indoor + outdoor) with countdown timers, mock weather AI banner, YouTube video suggestions, a Fitness sidebar link, and a `/fitness` history page — frontend only, localStorage-backed.

**Architecture:** `useWorkoutTracker` hook owns all state (timers, completion, video toggles) and persists to localStorage, mirroring the existing `useWaterTracker` pattern. `WorkoutCard` and `WorkoutSession` are pure display components driven by the hook. The dashboard grid becomes equal 3-col (Hydration | Workout | Tasks). The `/fitness` page reads saved workout state across the past 7 days.

**Tech Stack:** Next.js 16 App Router, React 18, TypeScript, Tailwind CSS, shadcn/ui (Card, Badge), lucide-react

---

## File Map

| Action | Path |
|--------|------|
| Modify | `types/index.ts` |
| Modify | `lib/storage.ts` |
| Create | `hooks/useWorkoutTracker.ts` |
| Create | `components/workout/workoutVideos.ts` |
| Create | `components/workout/WorkoutSession.tsx` |
| Create | `components/workout/WorkoutCard.tsx` |
| Modify | `app/(dashboard)/dashboard/page.tsx` |
| Modify | `components/shared/DashboardSidebar.tsx` |
| Create | `app/(dashboard)/fitness/page.tsx` |

---

## Task 1: Add Types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add workout types**

Open `types/index.ts` and append at the end of the file:

```ts
export interface WorkoutSessionState {
  done: boolean
  timerRunning: boolean
  timerSeconds: number
  timerFinished: boolean
  showConfirm: boolean
  showVideos: boolean
  intensity: 'low' | 'medium' | 'high'
}

export interface WorkoutTrackerState {
  indoor: WorkoutSessionState
  outdoor: WorkoutSessionState
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: no errors related to the new types.

- [ ] **Step 3: Commit**

```powershell
git add types/index.ts
git commit -m "feat: add WorkoutSessionState and WorkoutTrackerState types"
```

---

## Task 2: Add Storage Helpers

**Files:**
- Modify: `lib/storage.ts`

- [ ] **Step 1: Add import and helpers**

Add this import at the top of `lib/storage.ts` (after the existing import):

```ts
import type { WorkoutTrackerState } from '@/types'
```

Then append at the end of `lib/storage.ts`:

```ts
const WORKOUT_KEY = '75lab_workout'

export function getWorkoutState(date: string): WorkoutTrackerState | null {
  if (!isBrowser()) return null
  const raw = localStorage.getItem(`${WORKOUT_KEY}_${date}`)
  return raw ? (JSON.parse(raw) as WorkoutTrackerState) : null
}

export function saveWorkoutState(date: string, state: WorkoutTrackerState): void {
  if (!isBrowser()) return
  localStorage.setItem(`${WORKOUT_KEY}_${date}`, JSON.stringify(state))
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```powershell
git add lib/storage.ts
git commit -m "feat: add getWorkoutState and saveWorkoutState to storage"
```

---

## Task 3: Build useWorkoutTracker Hook

**Files:**
- Create: `hooks/useWorkoutTracker.ts`

- [ ] **Step 1: Create the hook file**

Create `hooks/useWorkoutTracker.ts` with this full content:

```ts
'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { WorkoutTrackerState, WorkoutSessionState } from '@/types'
import { getWorkoutState, saveWorkoutState, todayString } from '@/lib/storage'

const DEFAULT_SESSION: WorkoutSessionState = {
  done: false,
  timerRunning: false,
  timerSeconds: 2700,
  timerFinished: false,
  showConfirm: false,
  showVideos: false,
  intensity: 'medium',
}

const DEFAULT_STATE: WorkoutTrackerState = {
  indoor: { ...DEFAULT_SESSION },
  outdoor: { ...DEFAULT_SESSION },
}

export function useWorkoutTracker() {
  const [state, setState] = useState<WorkoutTrackerState>(DEFAULT_STATE)
  const [hydrated, setHydrated] = useState(false)

  // Load from localStorage after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    const saved = getWorkoutState(todayString())
    if (saved) setState(saved)
    setHydrated(true)
  }, [])

  // Persist whenever state changes, but only after initial load
  useEffect(() => {
    if (!hydrated) return
    saveWorkoutState(todayString(), state)
  }, [state, hydrated])

  // Countdown tick — uses functional setState to avoid stale closure
  useEffect(() => {
    if (!state.indoor.timerRunning && !state.outdoor.timerRunning) return
    const interval = setInterval(() => {
      setState(prev => {
        const next = { ...prev }
        let changed = false
        for (const type of ['indoor', 'outdoor'] as const) {
          if (!prev[type].timerRunning) continue
          changed = true
          const s = prev[type]
          if (s.timerSeconds <= 1) {
            next[type] = { ...s, timerSeconds: 0, timerRunning: false, timerFinished: true, showConfirm: true }
          } else {
            next[type] = { ...s, timerSeconds: s.timerSeconds - 1 }
          }
        }
        return changed ? next : prev
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [state.indoor.timerRunning, state.outdoor.timerRunning])

  const toggleTimer = useCallback((type: 'indoor' | 'outdoor') => {
    setState(prev => ({
      ...prev,
      [type]: { ...prev[type], timerRunning: !prev[type].timerRunning },
    }))
  }, [])

  const resetTimer = useCallback((type: 'indoor' | 'outdoor') => {
    setState(prev => ({
      ...prev,
      [type]: { ...prev[type], timerSeconds: 2700, timerRunning: false, timerFinished: false, showConfirm: false },
    }))
  }, [])

  const confirmDone = useCallback((type: 'indoor' | 'outdoor') => {
    setState(prev => ({
      ...prev,
      [type]: { ...prev[type], done: true, showConfirm: false },
    }))
  }, [])

  const dismissConfirm = useCallback((type: 'indoor' | 'outdoor') => {
    setState(prev => ({
      ...prev,
      [type]: { ...prev[type], showConfirm: false },
    }))
  }, [])

  const toggleVideos = useCallback((type: 'indoor' | 'outdoor') => {
    setState(prev => ({
      ...prev,
      [type]: { ...prev[type], showVideos: !prev[type].showVideos },
    }))
  }, [])

  const manualToggleDone = useCallback((type: 'indoor' | 'outdoor') => {
    setState(prev => ({
      ...prev,
      [type]: { ...prev[type], done: !prev[type].done },
    }))
  }, [])

  const bothDone = state.indoor.done && state.outdoor.done

  return {
    state,
    toggleTimer,
    resetTimer,
    confirmDone,
    dismissConfirm,
    toggleVideos,
    manualToggleDone,
    bothDone,
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```powershell
git add hooks/useWorkoutTracker.ts
git commit -m "feat: add useWorkoutTracker hook with countdown timer and localStorage persistence"
```

---

## Task 4: Create Video Data File

**Files:**
- Create: `components/workout/workoutVideos.ts`

- [ ] **Step 1: Create the file**

Create `components/workout/workoutVideos.ts`:

```ts
export interface WorkoutVideo {
  title: string
  channel: string
  emoji: string
  url: string
}

export const INDOOR_VIDEOS: WorkoutVideo[] = [
  {
    title: '45-Min Full Body HIIT',
    channel: 'Sydney Cummings Houdyshell',
    emoji: '🔥',
    url: 'https://www.youtube.com/results?search_query=45+minute+full+body+HIIT+Sydney+Cummings',
  },
  {
    title: '45-Min Yoga Flow',
    channel: 'Yoga With Adriene',
    emoji: '🧘',
    url: 'https://www.youtube.com/results?search_query=45+minute+yoga+flow+Adriene',
  },
  {
    title: '45-Min Strength No Equipment',
    channel: 'MuscleWatchers',
    emoji: '💪',
    url: 'https://www.youtube.com/results?search_query=45+minute+strength+training+no+equipment',
  },
]

export const OUTDOOR_VIDEOS: WorkoutVideo[] = [
  {
    title: '45-Min Outdoor HIIT Cardio',
    channel: 'The Body Coach TV',
    emoji: '🏃',
    url: 'https://www.youtube.com/results?search_query=45+minute+outdoor+HIIT+cardio',
  },
  {
    title: '45-Min Walk/Run Intervals',
    channel: "Runner's World",
    emoji: '🌿',
    url: 'https://www.youtube.com/results?search_query=45+minute+walk+run+intervals+outdoor',
  },
  {
    title: '45-Min Outdoor Full Body Stretch',
    channel: 'Bob & Brad',
    emoji: '🌤️',
    url: 'https://www.youtube.com/results?search_query=45+minute+outdoor+full+body+stretching',
  },
]
```

- [ ] **Step 2: Commit**

```powershell
git add components/workout/workoutVideos.ts
git commit -m "feat: add static workout video data for indoor and outdoor sessions"
```

---

## Task 5: Build WorkoutSession Component

**Files:**
- Create: `components/workout/WorkoutSession.tsx`

- [ ] **Step 1: Create the component**

Create `components/workout/WorkoutSession.tsx`:

```tsx
'use client'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkoutSessionState } from '@/types'
import { INDOOR_VIDEOS, OUTDOOR_VIDEOS } from './workoutVideos'

interface WorkoutSessionProps {
  type: 'indoor' | 'outdoor'
  session: WorkoutSessionState
  onToggleTimer(): void
  onResetTimer(): void
  onConfirmDone(): void
  onDismissConfirm(): void
  onToggleVideos(): void
  onManualToggle(): void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function WorkoutSession({
  type,
  session,
  onToggleTimer,
  onResetTimer,
  onConfirmDone,
  onDismissConfirm,
  onToggleVideos,
  onManualToggle,
}: WorkoutSessionProps) {
  const label = type === 'indoor' ? '🏠 Indoor Workout' : '🌤️ Outdoor Workout'
  const videos = type === 'indoor' ? INDOOR_VIDEOS : OUTDOOR_VIDEOS
  const timerComplete = session.timerSeconds === 0
  const showReset = session.timerFinished || session.timerSeconds < 2700

  return (
    <div
      className={cn(
        'border rounded-xl p-3 transition-colors',
        session.done ? 'border-primary/30 bg-primary/5' : 'border-border'
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 mb-3">
        <button onClick={onManualToggle} className="shrink-0">
          {session.done
            ? <CheckCircle2 className="h-5 w-5 text-primary" />
            : <Circle className="h-5 w-5 text-muted-foreground" />
          }
        </button>
        <span className={cn('text-sm font-semibold flex-1', session.done && 'line-through text-muted-foreground')}>
          {label}
        </span>
        <span className="text-xs text-muted-foreground">45 min</span>
      </div>

      {/* Timer display (hidden when done) */}
      {!session.done && (
        <div className="bg-muted/50 rounded-lg p-3 text-center mb-2">
          <div className="text-2xl font-bold tabular-nums tracking-wider">
            {formatTime(session.timerSeconds)}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">countdown timer</div>
        </div>
      )}

      {/* Timer controls */}
      {!session.done && (
        <div className="flex gap-2 mb-2">
          <button
            onClick={onToggleTimer}
            disabled={timerComplete}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              'bg-foreground text-background hover:opacity-90 disabled:opacity-40'
            )}
          >
            {session.timerRunning
              ? <><Pause className="h-3 w-3" />Pause</>
              : <><Play className="h-3 w-3" />{timerComplete ? 'Done' : 'Start'}</>
            }
          </button>
          {showReset && (
            <button
              onClick={onResetTimer}
              className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Confirm banner */}
      {session.showConfirm && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-2">
          <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">
            ⏰ Timer complete! Did you finish your {type} workout?
          </p>
          <div className="flex gap-2">
            <button
              onClick={onConfirmDone}
              className="flex-1 bg-green-600 text-white rounded-lg py-1.5 text-xs font-semibold hover:bg-green-700 transition-colors"
            >
              ✓ Yes, mark done
            </button>
            <button
              onClick={onDismissConfirm}
              className="flex-1 border border-border rounded-lg py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
            >
              Keep going
            </button>
          </div>
        </div>
      )}

      {/* AI suggestions toggle */}
      <button
        onClick={onToggleVideos}
        className="w-full border border-dashed border-border rounded-lg py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
      >
        {session.showVideos ? '▲ Hide suggestions' : '✨ Get AI Suggestions'}
      </button>

      {/* Video cards */}
      {session.showVideos && (
        <div className="mt-2 space-y-1.5">
          {videos.map(v => (
            <a
              key={v.url}
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 bg-muted/40 hover:bg-muted rounded-lg px-3 py-2 transition-colors no-underline"
            >
              <span className="text-xl shrink-0">{v.emoji}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{v.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{v.channel} · YouTube ↗</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```powershell
git add components/workout/WorkoutSession.tsx
git commit -m "feat: add WorkoutSession component with timer, confirm banner, and video suggestions"
```

---

## Task 6: Build WorkoutCard Component

**Files:**
- Create: `components/workout/WorkoutCard.tsx`

- [ ] **Step 1: Create the component**

Create `components/workout/WorkoutCard.tsx`:

```tsx
'use client'
import { useEffect, useRef } from 'react'
import { Flame } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useWorkoutTracker } from '@/hooks/useWorkoutTracker'
import { WorkoutSession } from './WorkoutSession'

const WEATHER_MOCK = {
  icon: '☀️',
  message: 'Perfect sunny weather! Your outdoor session is highly recommended today.',
}

interface WorkoutCardProps {
  onBothComplete(): void
}

export function WorkoutCard({ onBothComplete }: WorkoutCardProps) {
  const {
    state,
    toggleTimer,
    resetTimer,
    confirmDone,
    dismissConfirm,
    toggleVideos,
    manualToggleDone,
    bothDone,
  } = useWorkoutTracker()

  const firedRef = useRef(false)

  useEffect(() => {
    if (bothDone && !firedRef.current) {
      firedRef.current = true
      onBothComplete()
    }
    if (!bothDone) firedRef.current = false
  }, [bothDone, onBothComplete])

  const doneCount = (state.indoor.done ? 1 : 0) + (state.outdoor.done ? 1 : 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Workouts</CardTitle>
          <Badge
            variant="outline"
            className={doneCount === 2 ? 'border-green-500/30 bg-green-500/10 text-green-600' : ''}
          >
            {doneCount} / 2 done
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Weather mock banner */}
        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          <span className="text-base shrink-0 mt-0.5">{WEATHER_MOCK.icon}</span>
          <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">{WEATHER_MOCK.message}</p>
        </div>

        {/* Both done celebration */}
        {bothDone && (
          <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
            <Flame className="h-4 w-4 text-green-600" />
            <span className="text-xs font-semibold text-green-700 dark:text-green-400">Both workouts complete!</span>
          </div>
        )}

        <WorkoutSession
          type="indoor"
          session={state.indoor}
          onToggleTimer={() => toggleTimer('indoor')}
          onResetTimer={() => resetTimer('indoor')}
          onConfirmDone={() => confirmDone('indoor')}
          onDismissConfirm={() => dismissConfirm('indoor')}
          onToggleVideos={() => toggleVideos('indoor')}
          onManualToggle={() => manualToggleDone('indoor')}
        />
        <WorkoutSession
          type="outdoor"
          session={state.outdoor}
          onToggleTimer={() => toggleTimer('outdoor')}
          onResetTimer={() => resetTimer('outdoor')}
          onConfirmDone={() => confirmDone('outdoor')}
          onDismissConfirm={() => dismissConfirm('outdoor')}
          onToggleVideos={() => toggleVideos('outdoor')}
          onManualToggle={() => manualToggleDone('outdoor')}
        />
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```powershell
git add components/workout/WorkoutCard.tsx
git commit -m "feat: add WorkoutCard with weather banner and dual WorkoutSession blocks"
```

---

## Task 7: Update Dashboard Page

**Files:**
- Modify: `app/(dashboard)/dashboard/page.tsx`

The current grid section (lines 141–173) is:
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <Card>  {/* Hydration — col 1 */}
    ...
  </Card>

  <Card className="md:col-span-2">  {/* Today's Tasks — col 2-3 */}
    ...
  </Card>
</div>
```

- [ ] **Step 1: Add WorkoutCard import**

At the top of `app/(dashboard)/dashboard/page.tsx`, add after the last import:

```tsx
import { WorkoutCard } from '@/components/workout/WorkoutCard'
```

- [ ] **Step 2: Add autoCheckWorkout helper**

Inside `DashboardPage`, just before the `return` statement, add:

```tsx
function autoCheckWorkout() {
  const workoutTask = tasks.find(t => t.id === 'workout')
  if (workoutTask && !workoutTask.done) toggleTask('workout')
}
```

- [ ] **Step 3: Replace the grid section**

Replace the entire `<div className="grid grid-cols-1 md:grid-cols-3 gap-4">` block (lines 141–173) with:

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <Card>
    <CardHeader className="pb-2"><CardTitle className="text-base">Hydration</CardTitle></CardHeader>
    <CardContent className="flex justify-center py-2">
      <WaterTracker consumedMl={0} goalMl={waterGoal} />
    </CardContent>
  </Card>

  <WorkoutCard onBothComplete={autoCheckWorkout} />

  <Card>
    <CardHeader className="pb-2"><CardTitle className="text-base">Today&apos;s Tasks</CardTitle></CardHeader>
    <CardContent className="space-y-2">
      {tasks.map(task => (
        <button
          key={task.id}
          onClick={() => toggleTask(task.id)}
          className={cn(
            'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
            task.done
              ? 'border-primary/30 bg-primary/5'
              : 'border-border hover:bg-accent'
          )}
        >
          {task.done
            ? <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            : <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
          }
          <span className={cn('text-sm', task.done && 'line-through text-muted-foreground')}>
            {task.label}
          </span>
        </button>
      ))}
    </CardContent>
  </Card>
</div>
```

- [ ] **Step 4: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Manual check**

Open `http://localhost:3000/dashboard`. Verify:
- 3 equal columns: Hydration | Workouts | Today's Tasks
- WorkoutCard shows weather banner + Indoor + Outdoor blocks
- Completing both workouts auto-checks "Complete workout" in Today's Tasks

- [ ] **Step 6: Commit**

```powershell
git add "app/(dashboard)/dashboard/page.tsx"
git commit -m "feat: update dashboard grid to 3-col with WorkoutCard in center"
```

---

## Task 8: Add Fitness Link to Sidebar

**Files:**
- Modify: `components/shared/DashboardSidebar.tsx`

- [ ] **Step 1: Add Dumbbell import**

In `components/shared/DashboardSidebar.tsx`, find the lucide-react import line:

```tsx
import { Droplets, BookOpen, Utensils, Camera, Users, Calendar, LayoutDashboard, LogOut } from 'lucide-react'
```

Replace with:

```tsx
import { Droplets, BookOpen, Utensils, Camera, Users, Calendar, LayoutDashboard, LogOut, Dumbbell } from 'lucide-react'
```

- [ ] **Step 2: Add Fitness link**

Find the `links` array. After the `{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }` entry, add:

```tsx
{ href: '/fitness', label: 'Fitness', icon: Dumbbell },
```

The array should look like:

```tsx
const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/fitness',   label: 'Fitness',   icon: Dumbbell },
  { href: '/water',     label: 'Water',     icon: Droplets },
  { href: '/journal',   label: 'Journal',   icon: BookOpen },
  { href: '/nutrition', label: 'Nutrition', icon: Utensils },
  { href: '/cycle',     label: 'Cycle',     icon: Calendar },
  { href: '/photos',    label: 'Photos',    icon: Camera },
  { href: '/squads',    label: 'Squads',    icon: Users },
]
```

- [ ] **Step 3: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual check**

Open `http://localhost:3000/dashboard`. Verify "Fitness" link appears in sidebar between Dashboard and Water, with a dumbbell icon.

- [ ] **Step 5: Commit**

```powershell
git add components/shared/DashboardSidebar.tsx
git commit -m "feat: add Fitness link to sidebar navigation"
```

---

## Task 9: Build Fitness Page

**Files:**
- Create: `app/(dashboard)/fitness/page.tsx`

- [ ] **Step 1: Create the page**

Create `app/(dashboard)/fitness/page.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getWorkoutState, todayString } from '@/lib/storage'
import type { WorkoutTrackerState } from '@/types'

function getPast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

export default function FitnessPage() {
  const [weekData, setWeekData] = useState<Record<string, WorkoutTrackerState | null>>({})
  const today = todayString()

  useEffect(() => {
    const days = getPast7Days()
    const data: Record<string, WorkoutTrackerState | null> = {}
    for (const day of days) {
      data[day] = getWorkoutState(day)
    }
    setWeekData(data)
  }, [])

  const todayState = weekData[today]
  const totalSessions = Object.values(weekData).reduce((acc, s) => {
    if (!s) return acc
    return acc + (s.indoor.done ? 1 : 0) + (s.outdoor.done ? 1 : 0)
  }, 0)
  const fullDays = Object.values(weekData).filter(s => s?.indoor.done && s?.outdoor.done).length
  const completionRate = Math.round((totalSessions / 14) * 100)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Fitness</h1>
        <p className="text-muted-foreground mt-1">Your 75 Hard workout progress</p>
      </div>

      {/* Today's session status */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Today</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['indoor', 'outdoor'] as const).map(type => {
            const done = todayState?.[type].done ?? false
            return (
              <Card key={type}>
                <CardContent className="flex items-center gap-3 pt-4 pb-4">
                  {done
                    ? <CheckCircle2 className="h-8 w-8 text-primary shrink-0" />
                    : <Circle className="h-8 w-8 text-muted-foreground shrink-0" />
                  }
                  <div>
                    <p className="font-semibold text-sm">
                      {type === 'indoor' ? '🏠 Indoor' : '🌤️ Outdoor'} · 45 min
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {done ? 'Completed today' : 'Not done yet'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* 7-day grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {getPast7Days().map(day => {
              const s = weekData[day]
              const isToday = day === today
              const dayLabel = new Date(day + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' })
              return (
                <div key={day} className="flex flex-col items-center gap-1.5">
                  <span className={`text-[10px] font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    {dayLabel}
                  </span>
                  <div
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${s?.indoor.done ? 'bg-primary' : 'bg-muted'}`}
                    title="Indoor"
                  />
                  <div
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${s?.outdoor.done ? 'bg-primary' : 'bg-muted'}`}
                    title="Outdoor"
                  />
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Top dot = indoor · Bottom dot = outdoor</p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Sessions This Week', value: `${totalSessions}`, icon: '🏋️' },
          { label: 'Full Days This Week', value: `${fullDays}`, icon: '✅' },
          { label: 'Completion Rate', value: `${completionRate}%`, icon: '📊' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-4 text-center">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual check**

Navigate to `http://localhost:3000/fitness`. Verify:
- "Today" section shows Indoor and Outdoor cards with correct done/not-done state
- "This Week" grid shows 7 columns with day labels, two dots per day
- Stats cards show correct counts (all 0 if no workouts saved yet)
- Sidebar "Fitness" link is active/highlighted on this page

- [ ] **Step 4: Commit**

```powershell
git add "app/(dashboard)/fitness/page.tsx"
git commit -m "feat: add Fitness page with today's status, 7-day grid, and weekly stats"
```

---

## Done

All 9 tasks complete. The workout module is fully functional frontend-only. When you're ready to add backend (API routes, MongoDB WorkoutLog model, real weather API), the hook's `saveWorkoutState` / `getWorkoutState` calls are the only integration points to swap.
