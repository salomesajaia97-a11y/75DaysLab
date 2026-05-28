import mongoose, { Schema, Document } from 'mongoose'

export interface IFoodLog extends Document {
  userId: mongoose.Types.ObjectId
  date: string
  description: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  photoUrl?: string
  loggedAt: Date
}

const FoodLogSchema = new Schema<IFoodLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  description: { type: String, required: true },
  calories: { type: Number, default: 0 },
  proteinG: { type: Number, default: 0 },
  carbsG: { type: Number, default: 0 },
  fatG: { type: Number, default: 0 },
  photoUrl: String,
  loggedAt: { type: Date, default: Date.now },
})

FoodLogSchema.index({ userId: 1, date: 1 })

export const FoodLog =
  mongoose.models.FoodLog ?? mongoose.model<IFoodLog>('FoodLog', FoodLogSchema)
