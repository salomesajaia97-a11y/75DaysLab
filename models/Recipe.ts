import mongoose, { Schema, Document } from 'mongoose'

export interface IRecipe extends Document {
  title: string
  sourceUrl: string
  sourceSite: 'seriouseats' | 'skinnytaste' | 'allrecipes' | 'eatingwell' | 'kulinaria' | 'spruceeats'
  imageUrl?: string
  calories?: number
  cookTimeMin?: number
  prepTimeMin?: number
  totalTimeMin?: number
  servings?: number
  description?: string
  category?: string
  tags: string[]
  ingredients?: string[]
  instructions?: string[]
  scrapedAt: Date
}

const RecipeSchema = new Schema<IRecipe>({
  title:        { type: String, required: true },
  sourceUrl:    { type: String, required: true, unique: true },
  sourceSite:   { type: String, enum: ['seriouseats', 'skinnytaste', 'allrecipes', 'eatingwell', 'kulinaria', 'spruceeats'], required: true },
  imageUrl:     String,
  calories:     Number,
  cookTimeMin:  Number,
  prepTimeMin:  Number,
  totalTimeMin: Number,
  servings:     Number,
  description:  String,
  category:     String,
  tags:         { type: [String], default: [] },
  ingredients:  { type: [String], default: [] },
  instructions: { type: [String], default: [] },
  scrapedAt:    { type: Date, default: Date.now },
})

export const Recipe = mongoose.models.Recipe ?? mongoose.model<IRecipe>('Recipe', RecipeSchema)
