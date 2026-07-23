import mongoose, { Schema, Document } from 'mongoose'
import { isValidTimeZone } from '@/lib/date-key'

export interface IChallenge extends Document {
  userId: mongoose.Types.ObjectId
  startDate: Date
  totalDays: number
  currentDay: number
  currentStreak: number
  longestStreak: number
  /** 'YYYY-MM-DD' of the last fully-complete day — dedupes streak increments */
  lastCompletedDate?: string
  /** IANA timezone snapshot for this attempt's day boundaries (Phase 2D).
   *  Defaults to 'UTC' so existing/legacy challenges keep behaving EXACTLY as
   *  before until a future phase intentionally migrates them. Not yet consumed. */
  timeZone: string
  /** Version of the day-key convention this challenge was written under.
   *  1 = original UTC-derived keys. Bumped by a future phase, never here. */
  dateKeyVersion: number
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
    timeZone: {
      type: String,
      default: 'UTC',
      validate: {
        validator: (v: unknown) => isValidTimeZone(v),
        message: (props: { value: unknown }) => `Invalid IANA timezone: ${String(props.value)}`,
      },
    },
    dateKeyVersion: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

// Existing non-unique lookup index (unchanged) — serves the isActive query.
ChallengeSchema.index({ userId: 1, isActive: 1 })

// Enforce AT MOST ONE active challenge per user. Partial filter limits the
// unique constraint to active docs, so any number of inactive/historical
// (completed) challenges remain allowed and untouched.
ChallengeSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
)

export const Challenge =
  mongoose.models.Challenge ?? mongoose.model<IChallenge>('Challenge', ChallengeSchema)
