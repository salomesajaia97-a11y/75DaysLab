# Phase 2D-5 — Activate timezone-aware v2 for genuinely new challenges

**Branch:** `feat/phase2d-5-activate-new-challenge-v2` (off main `5b68085`)
**Status:** implementation plan (write before code, per task spec §L)

## Goal

Turn on the dormant v2 (timezone-aware) day-key convention **only for genuinely
new challenges**. Existing active challenges keep their exact recorded behavior:
v1 challenges stay UTC, v2 challenges keep their original snapshot. No history is
rewritten, no migration is run, nothing is deployed.

The machinery already exists (2D-1…2D-4): `recomputeDailyLog`, the challenge GET
self-heal, and every feature route resolve "today" through the version-gated
`logicalTodayFor` / `resolveLogicalToday`, which read `challenge.dateKeyVersion`
and `challenge.timeZone`. This phase is therefore a pure **activation switch at
onboarding** — no change to `lib/streak.ts` or `lib/recompute-daily-log.ts`.

## Files expected to change

| File | Change |
|------|--------|
| `lib/date-key.ts` | Add pure `isValidCivilDate(s)` (format + real-calendar-date) and `resolveOnboardingTimeZone(submitted, storedUser)` wrapper over `resolveTimeZone`. |
| `lib/date-key.test.ts` | Tests for the two new helpers (valid/invalid civil dates incl. `2026-02-31`; tz precedence + fallback). |
| `app/api/users/onboarding/route.ts` | Read `timeZone`; resolve effective tz; persist to `User.timeZone`; **create-or-preserve** the active challenge; validate/default `startDate`. |
| `app/api/users/onboarding/route.test.ts` | Rewrite/extend for create-or-preserve, tz fallback matrix, startDate validation, race handling. |
| `app/(onboarding)/onboarding/page.tsx` | Submit detected IANA tz; default startDate to local civil date via `dayKey` in a mount effect (no hydration mismatch); never overwrite a user-edited date. |

No schema change (fields exist from 2D-2). No new dependency.

## Current onboarding behavior (discovered)

- `POST /api/users/onboarding` is called from exactly one place — the onboarding
  page. It is **not** a profile editor.
- It validates challenge length (whitelist 30/40/55/75) → 400 on invalid.
- It `findByIdAndUpdate`s the User profile fields + `onboardingComplete:true`.
- It `Challenge.findOneAndUpdate({userId,isActive:true}, {...full doc...}, {upsert:true,new:true})`.
  **This overwrites an existing active challenge** — resetting `startDate`,
  `currentDay:1`, `currentStreak:0`, `totalDays`. It sets **no** `timeZone` and
  **no** `dateKeyVersion`, so new challenges default to `timeZone:'UTC'`,
  `dateKeyVersion:1` (dormant v1).
- No `startDate` validation: `new Date(startDate)` (missing → Invalid Date).
- Response: `{ success, profile:{ id, username, age, gender, heightCm, weightKg,
  goal, focusArea, startDate:'YYYY-MM-DD', totalDays } }`.

## How existing active challenges are preserved

Replace the blind upsert with **find-then-create-only-if-absent**:

1. `const existing = await Challenge.findOne({ userId, isActive: true })`
2. If `existing` → **preserve it untouched**. Do not modify `dateKeyVersion`,
   `timeZone`, `startDate`, streak/completed state, or identity. This holds for
   both active v1 (stays UTC v1) and active v2 (keeps its original snapshot; a
   different submitted tz does **not** re-snapshot it).
3. If absent → `Challenge.create({ ... timeZone: resolvedTz, dateKeyVersion: 2,
   startDate: <validated>, totalDays, currentDay:1, currentStreak:0,
   isActive:true })`.

`User.timeZone` may still update from a valid submitted tz even when the challenge
is preserved — updating the user profile never mutates an existing challenge's
snapshot or version.

## How a genuinely new challenge is identified

A challenge is "genuinely new" iff **no active challenge exists** for the user at
request time (`Challenge.findOne({userId,isActive:true})` is null). Inactive /
historical (completed) challenges do not count and are never modified. Only the
absent-active case creates, and it always creates as v2.

## Timezone resolution

Effective precedence (via `resolveOnboardingTimeZone` → `resolveTimeZone`):

```
valid submitted IANA tz  →  existing stored User.timeZone  →  DEFAULT_TIME_ZONE
```

- Submitted value validated by the shared `isValidTimeZone` — rejects non-IANA,
  empty, and raw offsets (`+04:00`, `UTC+4`, `GMT-5`) and unknown names
  (`Europe/Tbilisi`). Rejection is silent fallback, never an onboarding failure.
- `User.timeZone`: set to the resolved tz; a valid stored tz is never overwritten
  by invalid/missing input (the fallback returns the stored value → unchanged).
- A newly created `Challenge.timeZone` equals the same resolved tz.

## startDate default + validation

- **Client default** = user's *local civil date* via `dayKey(new Date(), tz)`
  (reuses the tested date service — explicit `formatToParts`, zero-padded, no
  `toISOString` slicing), set in a **mount `useEffect`** so SSR stays deterministic
  and there is no hydration mismatch. A user-edited date is never overwritten.
- **Server**: `startDate` is untrusted.
  - Present → must pass `isValidCivilDate` (exact `^\d{4}-\d{2}-\d{2}$` **and** a
    real calendar date — `2026-02-31` rejected, no JS normalization). Invalid → 400.
  - Missing → default to `currentDayKey(resolvedTz, clock)` (canonical, tz-aware).
  - Stored as `new Date(`${dateStr}T00:00:00.000Z`)` — UTC midnight of the civil
    date, matching how `streak`/`recompute` round-trip via `toDateStr`. Never
    reinterpreted through the server machine's local tz. No off-by-one.
- **Range rules:** current behavior imposes none; none invented here (spec §E).

## Concurrency / race handling

Two near-simultaneous onboarding POSTs must not create two active challenges.
`create()` is guarded by the existing unique partial index
(`{userId} unique where isActive:true`). On a duplicate-key error (11000) the
loser **re-reads and preserves** the winner's active challenge instead of
overwriting, and returns the normal success contract. Raw DB errors are never
leaked to the client. The index is not weakened or removed.

## API compatibility

Response shape, auth (401), and stale-session (404) behavior unchanged. For a
preserved existing challenge the response reflects that challenge's real
`startDate`/`totalDays`.

## Why streak/recompute are untouched

`lib/streak.ts` arithmetic (`addDays`/`diffDays`/`toDateStr`) treats `YYYY-MM-DD`
as UTC-midnight purely for **day counting**, which is offset-independent and
correct for civil-date strings. The strings now originate from the version-gated
service. `startDate` round-trips unchanged. Activating v2 on a new challenge makes
the full read+write+streak path timezone-aware automatically.

## Out of scope (must not change)

3/5 completion threshold, completion/perfect-day logic, streak engine math,
DailyLog schema, challenge history, dashboard/timezone-settings/fitness/water/
nutrition/journal/photo/admin UI, API response shapes, unrelated onboarding fields
or models. No Phase 2D-6. No migration. No deployment.

## Test plan

Server (`route.test.ts`) — create-or-preserve, tz matrix (valid/missing/invalid;
stored-tz preserved), v1 preserved on repeat, v2 not re-snapshotted, historical
untouched, race handled, startDate valid/malformed/impossible/default/edited.
Helpers (`date-key.test.ts`) — `isValidCivilDate` incl. `2026-02-31`, offsets,
`Europe/Tbilisi`; `resolveOnboardingTimeZone` precedence + fallback. Integration —
a v2 challenge makes `resolveLogicalToday` return the tz-local civil date at a
UTC/local boundary; a v1 challenge still returns legacy UTC. Client — no
component harness exists; keep client changes minimal, cover local-civil-date
formatting via the pure `dayKey` helper tests, document manual verification.
