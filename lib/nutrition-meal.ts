export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

/** Suggest a meal from the hour of `d`: <11 breakfast, 11–15 lunch, 16–21 dinner, else snack. */
export function mealFromTime(d: Date): MealType {
  const h = d.getHours()
  if (h < 11) return 'breakfast'
  if (h < 16) return 'lunch'
  if (h <= 21) return 'dinner'
  return 'snack'
}
