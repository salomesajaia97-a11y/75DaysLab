import mongoose, { Schema, Document } from 'mongoose'

export interface ICycleLog extends Document {
  userId: mongoose.Types.ObjectId
  startDate: Date
  endDate?: Date
  cycleLength?: number
  createdAt: Date
  updatedAt: Date
}

const CycleLogSchema = new Schema<ICycleLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, required: true },
    endDate: Date,
    cycleLength: Number,
  },
  { timestamps: true }
)

CycleLogSchema.index({ userId: 1, startDate: -1 })

export const CycleLog =
  mongoose.models.CycleLog ?? mongoose.model<ICycleLog>('CycleLog', CycleLogSchema)
