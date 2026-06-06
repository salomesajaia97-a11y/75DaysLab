import type { UserProfile } from '@/types'
import type { WorkoutTrackerState } from '@/types'

const PROFILE_KEY = '75lab_profile'
const STREAK_KEY = '75lab_streak'
const STREAK_DATE_KEY = '75lab_streak_date'
const DAILY_KEY = '75lab_daily'

export interface DailyState {
  date: string
  tasks: Record<string, boolean>
}

function isBrowser() {
  return typeof window !== 'undefined'
}

export function saveProfile(profile: UserProfile): void {
  if (!isBrowser()) return
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function getProfile(): UserProfile | null {
  if (!isBrowser()) return null
  const raw = localStorage.getItem(PROFILE_KEY)
  return raw ? (JSON.parse(raw) as UserProfile) : null
}

export function getStreak(): number {
  if (!isBrowser()) return 0
  return parseInt(localStorage.getItem(STREAK_KEY) || '0', 10)
}

export function getLastStreakDate(): string | null {
  if (!isBrowser()) return null
  return localStorage.getItem(STREAK_DATE_KEY)
}

export function saveStreak(streak: number, date: string): void {
  if (!isBrowser()) return
  localStorage.setItem(STREAK_KEY, String(streak))
  localStorage.setItem(STREAK_DATE_KEY, date)
}

export function resetStreak(): void {
  if (!isBrowser()) return
  localStorage.setItem(STREAK_KEY, '0')
  localStorage.removeItem(STREAK_DATE_KEY)
}

export function getDailyState(date: string): DailyState | null {
  if (!isBrowser()) return null
  const raw = localStorage.getItem(`${DAILY_KEY}_${date}`)
  return raw ? (JSON.parse(raw) as DailyState) : null
}

export function saveDailyState(state: DailyState): void {
  if (!isBrowser()) return
  localStorage.setItem(`${DAILY_KEY}_${state.date}`, JSON.stringify(state))
}

export function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

export function yesterdayString(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

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

const WATER_KEY = '75lab_water'

export function getWaterConsumed(date: string): number {
  if (!isBrowser()) return 0
  return parseInt(localStorage.getItem(`${WATER_KEY}_${date}`) || '0', 10)
}

export function saveWaterConsumed(date: string, ml: number): void {
  if (!isBrowser()) return
  localStorage.setItem(`${WATER_KEY}_${date}`, String(ml))
}
