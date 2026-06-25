// lib/recipes/types.ts
export interface WebRecipe {
  title: string
  ingredients: string[]
  instructions: string[]
  totalTimeMin?: number
  servings?: string
  imageUrl?: string
  sourceDomain: string   // internal only; never shown to the user
}
