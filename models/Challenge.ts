import mongoose, { Schema, Document } from 'mongoose'

export interface IChallenge extends Document {
  userId: mongoose.Types.ObjectId
  startDate: Date
  totalDays: number
  currentDay: number
  currentStreak: number
  longestStreak: number
  /** 'YYYY-MM-DD' of the last fully-complete day — dedupes streak increments */
  lastCompletedDate?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const ChallengeSchema = new Schema<IChallenge>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, required: true },
    totalDays: { type: Number, default: 75 },
    currentDay: { type: Number, default: 1 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastCompletedDate: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

ChallengeSchema.index({ userId: 1, isActive: 1 })

export const Challenge =
  mongoose.models.Challenge ?? mongoose.model<IChallenge>('Challenge', ChallengeSchema)
