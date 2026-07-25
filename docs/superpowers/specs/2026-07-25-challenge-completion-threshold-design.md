# Challenge Completion Threshold — Completed Day (3/5) & Perfect Day (5/5)

Date: 2026-07-25
Branch: `feat/challenge-completion-threshold`
Base main: `80a2c9da8da577b81593888385610791472588d8` (Phase 2D-5 merged)

## 1. Problem / product change

75DaysLab is **not** a strict 75 Hard clone. Today a day only "counts"
when **all five** tasks are done. The new rule introduces a partial-completion
threshold:

| completedTaskCount | Result |
|---|---|
| 0–2 | Incomplete Day |
| 3–4 | **Completed Day** (counts toward streak + challenge) |
| 5 | **Completed Day + Perfect Day** |

Threshold is inclusive: `count >= 3 → completed`, `count === 5 → perfect`.
Perfect Day is a **subset** of Completed Day — it never counts as two days and
never advances the challenge twice.

## 2. Current behavior discovered (audit)

### Canonical five daily tasks

Derived purely in [lib/daily-log.ts](../../../lib/daily-log.ts) →
`computeDailyFlags`, from source collections:

1. **water** — `waterMl >= waterGoalMl` (goal from profile) → `waterCompleted`
2. **journal** — `journalPagesRead >= JOURNAL_MIN_PAGES` (10) → `journalCompleted`
3. **nutrition** — `foodLogCount >= 1` → `nutritionCompleted`
4. **workout** — `structuredWorkoutCompleted && outdoorWorkoutCompleted`
   (75 Hard = TWO sessions, rolled up to one task) → `workoutCompleted`
5. **photo** — a progress photo exists → `photoUploaded`

`allComplete = computeAllComplete(flags)` is true **iff all five** tasks pass
(both workout sub-sessions count as the single workout task).

### Recompute path (single canonical spine)

`recomputeDailyLog(userId, date, workout?, clock)` in
[lib/recompute-daily-log.ts](../../../lib/recompute-daily-log.ts):

- Loads source data, calls the pure `computeDailyFlags`, upserts the DailyLog.
- Advances the Challenge **only when `date === logicalToday`** via the pure
  `nextChallengeState` ([lib/streak.ts](../../../lib/streak.ts)), passing
  `todayComplete = flags.allComplete`.
- Idempotent / self-healing.

**Every task route converges on this one function:**
`app/api/water`, `app/api/journal`, `app/api/nutrition`, `app/api/photos`,
`app/api/fitness/complete`, `app/api/challenge`, and the self-heal in
`app/api/daily-progress` all call `recomputeDailyLog`. There is **no** duplicated
`completedTasks >= N` anywhere.

### Streak / progress advancement

`nextChallengeState` is calendar-derived: in a healthy (unbroken) attempt every
prior day was completed, so `currentStreak = elapsed + (todayComplete ? 1 : 0)`,
`currentDay = clamp(elapsed + 1, 1, totalDays)`. `lastCompletedDate` dedupes
same-day increments; `isAttemptBroken` drives the hard reset. `todayComplete` is
the **only** completion input — it is currently `flags.allComplete`.

### Completion display / celebration

Dashboard ([app/(dashboard)/dashboard/page.tsx](../../../app/(dashboard)/dashboard/page.tsx))
reads server flags via `useDailyProgress`. It renders a `🎉 Day complete!` badge
only when `completedCount === 5` (`allDone`). The five tasks are **always**
rendered (never hidden). There is no modal/toast/confetti — the "celebration" is
a single badge, a pure render of server state (idempotent, non-destructive).

### Counters exposed

- `/api/daily-progress` returns `flags` (incl. `allComplete`) + `totalCompletedDays`
  = `DailyLog.countDocuments({ allComplete: true })` (historical, survives resets).
- `/api/fitness/complete` returns per-task flags + `allComplete`.
- `/api/admin/stats` counts per-task completions and total logs — **does not**
  use `allComplete`; no change needed.
- Squad components use challenge streak/day only — no completion flag; no change.
- `lib/legacy-migration.ts` never writes server state (Option C) — no change.

### Reversal / immutability

Completion is **already reversible** in the current architecture: unchecking a
workout or dropping water below goal recomputes `allComplete → false` and passes
`todayComplete = false`, lowering today's streak contribution. There is **no**
immutability lock. We preserve this policy exactly.

### Historical recomputation

`recomputeDailyLog` advances the Challenge **only for the live logical day**;
past dates are explicitly read-only ("No stored date key or historical record is
ever rewritten here"). The date-key service (Phase 2D) resolves the logical day;
this feature does not touch it.

## 3. New truth table (canonical)

Let `count` = number of the five task booleans that are true
(`waterCompleted, journalCompleted, nutritionCompleted, workoutCompleted, photoUploaded`).

| count | isCompletedDay | isPerfectDay |
|---|---|---|
| 0 | false | false |
| 1 | false | false |
| 2 | false | false |
| 3 | **true** | false |
| 4 | **true** | false |
| 5 | **true** | **true** |

Invariant: `isPerfectDay ⇒ isCompletedDay`. Also `isPerfectDay === allComplete`
(count === 5 ⟺ all five tasks true ⟺ `computeAllComplete`).

## 4. Data-model decision (smallest backward-compatible)

Two independent facts are needed: **is the day completed?** and **is it perfect?**

- **Perfect Day** — a suitable persisted field **already exists**: `allComplete`
  (all five tasks). Its meaning and writes are **unchanged**, so historical docs
  stay valid and `isPerfectDay` is **derived** from `allComplete`. No new perfect
  field is added.
- **Completed Day** — add one persisted boolean **`isCompleted`** (`count >= 3`),
  `default: false`. Required because `totalCompletedDays` is a Mongo count query
  and needs a queryable field, and the challenge advance needs the completed
  signal. Old docs lacking it read as `false`; where "completed" must include
  historically-perfect days, we read `isCompleted || allComplete`.
- `completedTaskCount` is **derived**, not persisted (cheap, avoids duplication).

Canonical pure result shape (added to `lib/daily-log.ts`):

```ts
interface DayResult { completedTaskCount: number; isCompletedDay: boolean; isPerfectDay: boolean }
computeDayResult(tasks) // single source; count >= 3 completed, === 5 perfect
```

`computeDailyFlags` now also returns `completedTaskCount`, `isCompletedDay`,
`isPerfectDay` (via `computeDayResult`). Only `isCompleted` is persisted.

## 5. Historical-data behavior (prospective, no migration)

- **No** bulk migration, **no** startup migration, **no** script rewriting past
  days, **no** recomputation of historical challenges.
- The new rule applies through the normal daily recompute path, which only ever
  touches the **live logical day**. Past `3/5` and `4/5` DailyLogs are **not**
  retroactively marked completed — they remain read-only until (and unless) they
  are the live day. This is **prospective from activation**, consistent with the
  established read-only-past architecture.
- `totalCompletedDays` counts `{ isCompleted: true } OR { allComplete: true }`,
  so historically-perfect days keep counting even before they carry the new field;
  historical 3/4 days stay uncounted (prospective).

No completion-rule versioning system is introduced — the architecture already
guarantees past records are never rewritten, so no corruption is possible.

## 6. Streak / progress behavior

- `recomputeDailyLog` passes `todayComplete = flags.isCompletedDay` (was
  `allComplete`) to `nextChallengeState`. **Streak uses Completed Day, not
  Perfect Day.** `lib/streak.ts` is otherwise unchanged.
- 0–2 tasks → does not continue the streak; 3–4 and 5 → continue it (once).
- Perfect status never independently increments the streak.
- Same calendar day never increments twice (existing `lastCompletedDate` dedupe).
- 3/5 → 5/5 upgrades perfect status but does not add another completed day.
- 5/5 → 4/5 removes perfect but stays completed. 3/5 → 2/5 follows the existing
  reversible policy (today's streak contribution drops); no new lock is added.

## 7. Challenge progress / finalization

`currentDay`, `currentStreak`, `longestStreak`, and `isComplete`
(`currentStreak >= totalDays`) are derived by `nextChallengeState`. A Completed
Day at 3/5+ advances once; repeated recompute / API calls are idempotent; a
Perfect Day is never an extra day; finalization at `totalDays` still happens
exactly once. `totalDays` / challenge-length behavior is unchanged.

## 8. API changes (additive, backward-compatible)

- `/api/daily-progress`: `flags` gains `isCompleted`, `isPerfectDay`,
  `completedTaskCount` (existing fields incl. `allComplete` unchanged);
  `totalCompletedDays` count query broadened to `isCompleted || allComplete`.
- `/api/fitness/complete`: response gains `isCompleted`, `isPerfectDay`
  (existing fields unchanged).
- No renames, no removals, no auth/authz changes, no internal-field leakage.

## 9. UI changes (minimal, reuse existing components)

Dashboard status badge (reusing the existing `Badge`, colors, icons):

- challenge finished (`view.isComplete`) → existing complete badge (unchanged)
- else `isPerfectDay` (5/5) → **Perfect Day** badge
- else `isCompletedDay` (3–4/5) → **Completed Day** badge + real `N of 5` count
- else (0–2/5) → no completed badge (progress bar + `done/total` only)

The five tasks stay visible at all counts, so the user can finish tasks 4 and 5
to upgrade Completed → Perfect. No "All tasks completed" copy at 3/5 or 4/5.
New i18n keys added to **both** `en.json` and `ge.json` (app already ships EN+GE):
`dashboard.status.completed_day`, `dashboard.status.perfect_day`,
`dashboard.status.tasks_completed`.

## 10. Test strategy

- **Pure calc** (`lib/daily-log.test.ts`): truth table 0–5, perfect ⇒ completed,
  determinism, `isPerfectDay === allComplete`.
- **Recompute/integration** is DB-bound; covered at the pure boundary
  (`computeDailyFlags` / `computeDayResult`) and via `nextChallengeState` for
  streak idempotence/advance-once, plus the existing route tests.
- **Streak** (`lib/streak.test.ts`): 3/5-driven `todayComplete` continues the
  streak once; consecutive 3/5, 4/5, 5/5 → 3-day streak; 2/5 does not continue;
  repeated same-day eval idempotent; gap breaks per existing rules.
- **API**: existing `daily-progress` / `water` / `photos` route tests remain
  green (additive response fields); count query broadened.
- No new frontend test framework; no timezone/date-key duplication (Phase 2D
  service reused unchanged).

## 11. Intentionally deferred (out of scope)

Phase 2D-6; timezone display/settings UI; historical bulk migration; completion-
rule versioning; perfect streak / perfect-week; achievements / badges / rewards /
leaderboards; social sharing; push notifications; monetization; new daily tasks;
configurable thresholds; difficulty selection; challenge-restart redesign;
dashboard redesign; unrelated refactors. No deployment.
