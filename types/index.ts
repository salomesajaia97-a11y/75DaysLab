export type Goal = 'lose' | 'gain' | 'maintain'
export type FocusArea = 'nutrition' | 'workout' | 'sleep' | 'other'
export type Gender = 'male' | 'female' | 'other'

export interface UserProfile {
  id: string
  username: string
  age: number
  gender: Gender
  heightCm: number
  weightKg: number
  goal: Goal
  focusArea: FocusArea
  startDate: string
  totalDays: number
}

export interface MacroTargets {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}

export interface WaterEntry {
  id: string
  amountMl: number
  loggedAt: string
}

export interface JournalEntry {
  id: string
  date: string
  bookTitle: string
  pagesRead: number
  notes: string
}

export interface FoodEntry {
  id: string
  description: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  loggedAt: string
  photoUrl?: string
}

export interface DailyLog {
  date: string
  waterMl: number
  waterGoalMl: number
  journalCompleted: boolean
  nutritionCompleted: boolean
  workoutCompleted: boolean
  photoUploaded: boolean
  streakDay: number
}

export interface CycleEntry {
  id: string
  startDate: string
  endDate?: string
  cycleLength?: number
}

export interface Squad {
  id: string
  name: string
  code: string
  members: SquadMember[]
}

export interface SquadMember {
  userId: string
  username: string
  currentStreak: number
  completedDays: number
}

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
