import type { UserProfile } from '@/types'
import type { WorkoutTrackerState } from '@/types'

// ── User-scoped client cache ────────────────────────────────────────────────
// All keys below are NON-authoritative caches of server data. Authenticated
// identity (id/email/username/role) must always come from the server session,
// never from here. To prevent cross-account leakage every key is namespaced by
// the active authenticated user id, and `clearUserScopedStorage()` wipes the
// whole namespace on logout/account switch.

const PROFILE_KEY = '75lab_profile'
const STREAK_KEY = '75lab_streak'
const STREAK_DATE_KEY = '75lab_streak_date'
const DAILY_KEY = '75lab_daily'

/** localStorage key that records which user the cached data belongs to. */
const UID_KEY = '75lab_uid'

/** Prefixes owned by user-scoped (non-preference) data. */
const USER_SCOPED_PREFIXES = ['75lab_', 'cycle_'] as const

export interface DailyState {
  date: string
  tasks: Record<string, boolean>
}

function isBrowser() {
  return typeof window !== 'undefined'
}

// Cached in-module so repeated reads don't hit localStorage; `undefined` means
// "not yet initialized", distinct from `null` ("no active user / guest").
let activeUid: string | null | undefined

function readUid(): string | null {
  if (!isBrowser()) return null
  if (activeUid === undefined) activeUid = localStorage.getItem(UID_KEY)
  return activeUid ?? null
}

/** The user id the cached data is currently scoped to, or null for guest. */
export function getStorageUser(): string | null {
  return readUid()
}

/**
 * Set the active user scope. Call right after a session is established (see
 * SessionBoot). Subsequent reads/writes are partitioned under this id.
 */
export function setStorageUser(uid: string | null): void {
  if (!isBrowser()) return
  activeUid = uid
  if (uid) localStorage.setItem(UID_KEY, uid)
  else localStorage.removeItem(UID_KEY)
}

/** Namespace a base key by the active user (or `guest` when unauthenticated). */
export function scopedKey(base: string): string {
  const uid = readUid()
  return `${base}::${uid ?? 'guest'}`
}

/** True when `key` holds user-scoped data (i.e. must be cleared on logout). */
export function isUserScopedKey(key: string): boolean {
  if (key === UID_KEY) return false
  return USER_SCOPED_PREFIXES.some((p) => key.startsWith(p))
}

/**
 * Remove ALL user-scoped cached data (profile, streak, daily, workout, water,
 * steps, cycle, …) plus the uid marker. Preferences that live outside the
 * `75lab_`/`cycle_` namespaces (theme, locale) are intentionally preserved.
 * Safe to call repeatedly.
 */
export function clearUserScopedStorage(): void {
  if (!isBrowser()) return
  const toRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && isUserScopedKey(k)) toRemove.push(k)
  }
  for (const k of toRemove) localStorage.removeItem(k)
  activeUid = null
  localStorage.removeItem(UID_KEY)
}

// ── Profile ────────────────────────────────────────────────────────────────

export function saveProfile(profile: UserProfile): void {
  if (!isBrowser()) return
  localStorage.setItem(scopedKey(PROFILE_KEY), JSON.stringify(profile))
}

export function getProfile(): UserProfile | null {
  if (!isBrowser()) return null
  const raw = localStorage.getItem(scopedKey(PROFILE_KEY))
  return raw ? (JSON.parse(raw) as UserProfile) : null
}

// ── Streak ───────────────────────────────────────────────────────────────

export function getStreak(): number {
  if (!isBrowser()) return 0
  return parseInt(localStorage.getItem(scopedKey(STREAK_KEY)) || '0', 10)
}

export function getLastStreakDate(): string | null {
  if (!isBrowser()) return null
  return localStorage.getItem(scopedKey(STREAK_DATE_KEY))
}

export function saveStreak(streak: number, date: string): void {
  if (!isBrowser()) return
  localStorage.setItem(scopedKey(STREAK_KEY), String(streak))
  localStorage.setItem(scopedKey(STREAK_DATE_KEY), date)
}

export function resetStreak(): void {
  if (!isBrowser()) return
  localStorage.setItem(scopedKey(STREAK_KEY), '0')
  localStorage.removeItem(scopedKey(STREAK_DATE_KEY))
}

// ── Daily task state ─────────────────────────────────────────────────────────

export function getDailyState(date: string): DailyState | null {
  if (!isBrowser()) return null
  const raw = localStorage.getItem(scopedKey(`${DAILY_KEY}_${date}`))
  return raw ? (JSON.parse(raw) as DailyState) : null
}

export function saveDailyState(state: DailyState): void {
  if (!isBrowser()) return
  localStorage.setItem(scopedKey(`${DAILY_KEY}_${state.date}`), JSON.stringify(state))
}

export function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

export function yesterdayString(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

// ── Workout tracker (legacy per-day slot state) ───────────────────────────────

const WORKOUT_KEY = '75lab_workout'

export function getWorkoutState(date: string): WorkoutTrackerState | null {
  if (!isBrowser()) return null
  const raw = localStorage.getItem(scopedKey(`${WORKOUT_KEY}_${date}`))
  return raw ? (JSON.parse(raw) as WorkoutTrackerState) : null
}

export function saveWorkoutState(date: string, state: WorkoutTrackerState): void {
  if (!isBrowser()) return
  localStorage.setItem(scopedKey(`${WORKOUT_KEY}_${date}`), JSON.stringify(state))
}

// ── Water ─────────────────────────────────────────────────────────────────────

const WATER_KEY = '75lab_water'

export function getWaterConsumed(date: string): number {
  if (!isBrowser()) return 0
  return parseInt(localStorage.getItem(scopedKey(`${WATER_KEY}_${date}`)) || '0', 10)
}

export function saveWaterConsumed(date: string, ml: number): void {
  if (!isBrowser()) return
  localStorage.setItem(scopedKey(`${WATER_KEY}_${date}`), String(ml))
}
