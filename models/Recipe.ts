import mongoose, { Schema, Document } from 'mongoose'

export interface IRecipe extends Document {
  title: string
  sourceUrl: string
  sourceSite: 'seriouseats' | 'skinnytaste' | 'allrecipes' | 'eatingwell' | 'kulinaria' | 'spruceeats' | 'minimalistbaker' | 'loveandlemons'
  imageUrl?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  cookTimeMin?: number
  prepTimeMin?: number
  totalTimeMin?: number
  servings?: number
  description?: string
  category?: string
  tags: string[]
  ingredientCount?: number
  isOnePot?: boolean
  dietTags: string[]
  ingredients?: string[]
  instructions?: string[]
  scrapedAt: Date
}

const RecipeSchema = new Schema<IRecipe>({
  title:        { type: String, required: true },
  sourceUrl:    { type: String, required: true, unique: true },
  sourceSite:   { type: String, enum: ['seriouseats', 'skinnytaste', 'allrecipes', 'eatingwell', 'kulinaria', 'spruceeats', 'minimalistbaker', 'loveandlemons'], required: true },
  imageUrl:     String,
  calories:     Number,
  protein:      Number,
  carbs:        Number,
  fat:          Number,
  cookTimeMin:  Number,
  prepTimeMin:  Number,
  totalTimeMin: Number,
  servings:     Number,
  description:  String,
  category:     String,
  tags:         { type: [String], default: [] },
  ingredientCount: Number,
  isOnePot:        { type: Boolean, default: false },
  dietTags:        { type: [String], default: [] },
  ingredients:  { type: [String], default: [] },
  instructions: { type: [String], default: [] },
  scrapedAt:    { type: Date, default: Date.now },
})

RecipeSchema.index({ ingredientCount: 1 })
RecipeSchema.index({ isOnePot: 1 })
RecipeSchema.index({ dietTags: 1 })
RecipeSchema.index({ totalTimeMin: 1 })

export const Recipe = mongoose.models.Recipe ?? mongoose.model<IRecipe>('Recipe', RecipeSchema)
