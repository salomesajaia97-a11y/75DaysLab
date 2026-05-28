import type { Goal, Gender, MacroTargets } from '@/types'

// 35ml/kg baseline; female -200ml; gain +500ml; lose +300ml (hydration aids fat loss)
export function calculateWaterGoal(weightKg: number, gender: Gender, goal: Goal): number {
  let base = Math.round(weightKg * 35)
  if (gender === 'female') base -= 200
  if (goal === 'gain') base += 500
  if (goal === 'lose') base += 300
  return Math.max(base, 1500)
}

// Mifflin-St Jeor BMR × 1.55 (moderate activity) ± goal adjustment
export function calculateMacros(
  age: number,
  gender: Gender,
  heightCm: number,
  weightKg: number,
  goal: Goal,
): MacroTargets {
  const bmr =
    gender === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161

  const tdee = Math.round(bmr * 1.55)

  let calories: number
  if (goal === 'lose') calories = Math.round(tdee - 500)
  else if (goal === 'gain') calories = Math.round(tdee + 300)
  else calories = tdee

  const proteinG = Math.round(weightKg * 2.2)
  const fatG = Math.round((calories * 0.25) / 9)
  const carbsG = Math.max(Math.round((calories - proteinG * 4 - fatG * 9) / 4), 50)

  return { calories, proteinG, carbsG, fatG }
}

export function calculateCurrentDay(startDate: string, totalDays: number): number {
  const start = new Date(startDate)
  const today = new Date()
  start.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return Math.min(Math.max(diff + 1, 1), totalDays)
}
