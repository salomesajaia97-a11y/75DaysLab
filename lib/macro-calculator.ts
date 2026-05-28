import type { MacroTargets, Goal, Gender } from '@/types'

interface Profile {
  age: number
  gender: Gender
  heightCm: number
  weightKg: number
  goal: Goal
}

function calculateBMR(profile: Profile): number {
  const { age, gender, heightCm, weightKg } = profile
  if (gender === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161
}

export function calculateMacroTargets(profile: Profile): MacroTargets {
  const bmr = calculateBMR(profile)
  const tdee = bmr * 1.55

  let calories: number
  if (profile.goal === 'lose') calories = tdee - 500
  else if (profile.goal === 'gain') calories = tdee + 300
  else calories = tdee

  const proteinG = Math.round(profile.weightKg * 2.2)
  const fatG = Math.round((calories * 0.25) / 9)
  const carbsG = Math.round((calories - proteinG * 4 - fatG * 9) / 4)

  return { calories: Math.round(calories), proteinG, carbsG, fatG }
}

export function calculateWaterGoalMl(weightKg: number): number {
  return Math.round(weightKg * 35)
}
