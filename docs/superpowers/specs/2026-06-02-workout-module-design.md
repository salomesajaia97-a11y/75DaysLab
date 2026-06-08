# Workout Module — Frontend Design Spec

**Date:** 2026-06-02  
**Scope:** Frontend only. No backend API routes or DB models in this phase.  
**Inspired by:** 75 Hard challenge (2 × 45-min workouts per day: indoor + outdoor)

---

## 1. Goals

- Replace the single "Complete workout" checkbox with a dedicated, interactive Workout card
- Track two daily sessions (indoor + outdoor) each with a 45-min countdown timer
- Show a weather-based AI motivational message (mock/hardcoded for now)
- Provide AI video suggestions that open YouTube in a new tab
- Add a `/fitness` page accessible from the sidebar
- Auto-check the existing `workout` streak task when both sessions complete
- Prep state shape for future calorie burn integration with MacroCalculator

---

## 2. Layout Change

### Dashboard Grid (3-column equal)

```
[ Hydration ]  [ Workout ]  [ Today's Tasks ]
     1/3            1/3             1/3
```

- Existing grid: `grid-cols-1 md:grid-cols-3`
- Hydration stays col 1
- WorkoutCard new in col 2
- Today's Tasks moves to col 3 (drops `md:col-span-2`)
- "Complete workout" task row stays in Today's Tasks list — auto-checked via `onBothComplete` callback

---

## 3. New Files

### `hooks/useWorkoutTracker.ts`

State shape:
```ts
interface WorkoutSessionState {
  done: boolean
  timerRunning: boolean
  timerSeconds: number       // starts at 2700 (45 × 60)
  timerFinished: boolean
  showConfirm: boolean
  showVideos: boolean
  intensity: 'low' | 'medium' | 'high'  // unused now, prep for calorie burn
}

interface WorkoutTrackerState {
  indoor: WorkoutSessionState
  outdoor: WorkoutSessionState
}
```

Exposed API:
- `state: WorkoutTrackerState`
- `toggleTimer(type: 'indoor' | 'outdoor'): void` — start/pause
- `resetTimer(type): void`
- `confirmDone(type): void` — marks done, clears confirm
- `dismissConfirm(type): void` — hides confirm, keeps timer at 0
- `toggleVideos(type): void`
- `manualToggleDone(type): void` — checkbox click without timer
- `bothDone: boolean`

Persistence: reads/writes via `getWorkoutState(date)` / `saveWorkoutState(date, state)` in `lib/storage.ts`.

Timer logic: `useEffect` with `setInterval(1000)` when `timerRunning`. On reaching 0: sets `timerFinished = true`, `timerRunning = false`, `showConfirm = true`.

### `components/workout/WorkoutSession.tsx`

Props:
```ts
{
  type: 'indoor' | 'outdoor'
  session: WorkoutSessionState
  onToggleTimer(): void
  onConfirmDone(): void
  onDismissConfirm(): void
  onToggleVideos(): void
  onManualToggle(): void
}
```

Renders:
1. Checkbox + session label (🏠 Indoor / 🌤️ Outdoor)
2. Timer display (`MM:SS`, tabular-nums font)
3. Start/Pause button
4. Confirm banner (when `showConfirm`) — "Did you finish? Yes / Keep going"
5. "✨ Get AI Suggestions" button — toggles `showVideos`
6. Video cards section (3 cards, only when `showVideos`) — links open `target="_blank"`

Video data: static arrays in `components/workout/workoutVideos.ts`:
```ts
indoor: [
  { title: '45-Min Full Body HIIT', channel: 'Sydney Cummings Houdyshell', url: '...' },
  { title: '45-Min Yoga Flow', channel: 'Yoga With Adriene', url: '...' },
  { title: '45-Min Strength Training No Equipment', channel: 'MuscleWatchers', url: '...' },
]
outdoor: [
  { title: '45-Min Outdoor HIIT Cardio', channel: 'The Body Coach TV', url: '...' },
  { title: '45-Min Walk/Run Intervals', channel: "Runner's World", url: '...' },
  { title: '45-Min Outdoor Full Body Stretch', channel: 'Bob & Brad', url: '...' },
]
```

### `components/workout/WorkoutCard.tsx`

Props:
```ts
{ onBothComplete(): void }
```

Renders:
1. Card header: "Workouts" + `X / 2 done` badge
2. Weather mock banner (hardcoded sunny message — swap with API later)
3. `<WorkoutSession type="indoor" ... />`
4. `<WorkoutSession type="outdoor" ... />`
5. When `bothDone`: green completion badge

Calls `onBothComplete()` in a `useEffect` when `bothDone` flips to `true`. Does NOT call it on every render (guard with ref).

### `app/(dashboard)/fitness/page.tsx`

Sections:
1. **Today's Workouts** — summary of indoor/outdoor status (reads localStorage)
2. **This Week** — 7-column grid, each day shows 2 dots (indoor/outdoor) filled or empty
3. **All-Time Stats** — placeholder cards: Total Sessions, Longest Streak, This Month
4. No backend calls in this phase — all from `getWorkoutState(date)` across last 7 days

---

## 4. Modified Files

### `app/(dashboard)/dashboard/page.tsx`
- Change grid from `grid-cols-1 md:grid-cols-3` — Today's Tasks loses `md:col-span-2`
- Import and render `<WorkoutCard onBothComplete={() => autoCheckWorkout()} />`
- Add `autoCheckWorkout()`: calls `toggleTask('workout')` only if not already done

### `components/shared/DashboardSidebar.tsx`
- Import `Dumbbell` from `lucide-react`
- Add `{ href: '/fitness', label: 'Fitness', icon: Dumbbell }` after the Dashboard link

### `types/index.ts`
- Export `WorkoutSessionState` and `WorkoutTrackerState` interfaces

### `lib/storage.ts`
- Add `getWorkoutState(date: string): WorkoutTrackerState | null`
- Add `saveWorkoutState(date: string, state: WorkoutTrackerState): void`
- Keys: `workout_${date}`

---

## 5. Weather Mock

Hardcoded in `WorkoutCard.tsx`. Shape for future swap:
```ts
const WEATHER_MOCK = {
  condition: 'sunny' as 'sunny' | 'rainy' | 'cloudy' | 'cold',
  message: 'Perfect sunny weather! Your outdoor session is highly recommended today. ☀️',
}
```
When real weather API is added: replace `WEATHER_MOCK` with a `useWeather()` hook call. No other changes needed.

---

## 6. Calorie Burn Prep

`WorkoutSessionState.intensity` field (`'low' | 'medium' | 'high'`) is stored but not surfaced in UI yet. When MacroCalculator integration is ready: read `intensity` from saved workout state and pass to `calculateMacros()` as a `activityBonus` parameter.

---

## 7. Out of Scope (This Phase)

- Real weather API
- Backend API routes (`/api/workout`)
- MongoDB `WorkoutLog` model
- Actual AI model calls for video suggestions
- Calorie burn calculation update
- Workout history beyond 7 days

---

## 8. Implementation Order

1. Add types to `types/index.ts`
2. Add storage helpers to `lib/storage.ts`
3. Build `hooks/useWorkoutTracker.ts`
4. Build `components/workout/workoutVideos.ts` (static data)
5. Build `components/workout/WorkoutSession.tsx`
6. Build `components/workout/WorkoutCard.tsx`
7. Update `app/(dashboard)/dashboard/page.tsx` (grid + WorkoutCard + auto-check)
8. Update `components/shared/DashboardSidebar.tsx` (Fitness link)
9. Build `app/(dashboard)/fitness/page.tsx`
