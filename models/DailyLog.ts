import mongoose, { Schema, Document } from 'mongoose'

export interface IDailyLog extends Document {
  userId: mongoose.Types.ObjectId
  date: string
  waterCompleted: boolean
  journalCompleted: boolean
  nutritionCompleted: boolean
  /** true only when BOTH structured and outdoor workouts are done (75 Hard rule) */
  workoutCompleted: boolean
  structuredWorkoutCompleted: boolean
  outdoorWorkoutCompleted: boolean
  photoUploaded: boolean
  allComplete: boolean
  createdAt: Date
  updatedAt: Date
}

const DailyLogSchema = new Schema<IDailyLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    waterCompleted: { type: Boolean, default: false },
    journalCompleted: { type: Boolean, default: false },
    nutritionCompleted: { type: Boolean, default: false },
    workoutCompleted: { type: Boolean, default: false },
    structuredWorkoutCompleted: { type: Boolean, default: false },
    outdoorWorkoutCompleted: { type: Boolean, default: false },
    photoUploaded: { type: Boolean, default: false },
    allComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
)

DailyLogSchema.index({ userId: 1, date: 1 }, { unique: true })

export const DailyLog =
  mongoose.models.DailyLog ?? mongoose.model<IDailyLog>('DailyLog', DailyLogSchema)
