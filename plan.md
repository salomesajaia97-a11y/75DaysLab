# 75DaysLab — Implementation Plan

**Stack:** Next.js 14 (App Router) · Tailwind CSS · shadcn/ui · Mongoose · MongoDB · NextAuth · OpenAI · Cloudinary · Google Maps · OpenWeather

---

## Phase 1 — Frontend UI

| Task | Deliverable |
|------|-------------|
| 1 | Project bootstrap (Next.js + Tailwind + shadcn init, shared types) |
| 2 | Layout: dashboard sidebar + root layout |
| 3 | Onboarding wizard (4-step: profile → goal → focus → timeline) |
| 4 | Streak counter (animated circular progress + Framer Motion) |
| 5 | Water tracker (animated glass fill + quick-add buttons) |
| 6 | Macro dashboard (calorie total + protein/carbs/fat bars) + food logger form |
| 7 | Journal entry form (book title, pages ≥10 validation, notes) |
| 8 | Cycle calendar (period/ovulation/fertile markers via shadcn Calendar) |
| 9 | Photo vault (drag-drop upload + side-by-side comparison slider) |
| 10 | Squads UI (squad cards + ranked leaderboard) |
| 11 | Main dashboard page (streak + water + daily task checklist) |

---

## Phase 2 — Backend + Mongoose

| Task | Deliverable |
|------|-------------|
| 12 | DB connection singleton + all Mongoose models (User, Challenge, DailyLog, WaterLog, JournalEntry, FoodLog, CycleLog, Photo, Squad) |
| 13 | Utility libs: macro calculator (BMR/TDEE), cycle predictor, streak evaluator, Cloudinary uploader |
| 14 | API routes: `/api/water`, `/api/journal`, `/api/photos` |
| 15 | API routes: `/api/nutrition`, `/api/cycle`, `/api/squads`, `/api/squads/[id]/invite` |
| 16 | API routes: `/api/users`, `/api/users/onboarding`, `/api/challenge` |

---

## Phase 3 — Auth Module

| Task | Deliverable |
|------|-------------|
| 17 | NextAuth credentials provider, bcrypt hashing, login/register pages, route middleware (protects `/dashboard/*`, redirects to onboarding if incomplete) |

---

## Phase 4 — AI Integration

| Task | Deliverable |
|------|-------------|
| 18 | AI food logger: `/api/ai/food-log` — GPT-4o-mini analyzes text description or uploaded photo, returns calories + macros, saves to FoodLog |
| 19 | AI recipe coach: `/api/ai/recipe` — streaming GPT-4o-mini endpoint with system prompt personalized to user's macro targets |

---

## Phase 5 — Geo & Weather

| Task | Deliverable |
|------|-------------|
| 20 | `/api/geo` — combines OpenWeather + Google Places API: returns weather conditions, nearby parks (good weather check), nearby healthy restaurants |

---

## Phase 6 — Gamification

| Task | Deliverable |
|------|-------------|
| 21 | `/api/challenge/streak` — evaluates yesterday's DailyLog, increments streak or hard-resets to Day 1 if any task incomplete |

---

## Key Files

```
app/
  (auth)/login, register          → Auth pages
  (onboarding)/                   → 4-step wizard
  (dashboard)/dashboard           → Main hub
  (dashboard)/water|journal|...   → Feature pages
  api/                            → All route handlers

components/
  water/WaterTracker.tsx
  streak/StreakCounter.tsx
  nutrition/MacroDashboard.tsx + FoodLogger.tsx
  journal/JournalEntry.tsx
  cycle/CycleCalendar.tsx
  photos/PhotoUpload.tsx + PhotoComparison.tsx
  squads/SquadCard.tsx + Leaderboard.tsx

lib/
  mongoose.ts                     → DB singleton
  auth.ts                         → NextAuth config
  macro-calculator.ts             → BMR/TDEE/macros
  cycle-predictor.ts              → Period/ovulation math
  streak.ts                       → Completion check + reset
  cloudinary.ts                   → Upload helper

models/
  User, Challenge, DailyLog, WaterLog,
  JournalEntry, FoodLog, CycleLog, Photo, Squad
```

---

## Environment Variables Needed

```env
MONGODB_URI=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
OPENAI_API_KEY=
GOOGLE_MAPS_API_KEY=
OPENWEATHER_API_KEY=
```

---

## Detailed Plan

Full task-by-task implementation with code: [`docs/superpowers/plans/2026-05-26-75days-lab.md`](docs/superpowers/plans/2026-05-26-75days-lab.md)
