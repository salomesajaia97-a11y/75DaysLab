import mongoose, { Schema, Document } from 'mongoose'

export interface IDailyLog extends Document {
  userId: mongoose.Types.ObjectId
  date: string
  waterCompleted: boolean
  journalCompleted: boolean
  nutritionCompleted: boolean
  workoutCompleted: boolean
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
    photoUploaded: { type: Boolean, default: false },
    allComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
)

DailyLogSchema.index({ userId: 1, date: 1 }, { unique: true })

export const DailyLog =
  mongoose.models.DailyLog ?? mongoose.model<IDailyLog>('DailyLog', DailyLogSchema)
