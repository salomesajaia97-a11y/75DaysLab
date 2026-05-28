import mongoose, { Schema, Document } from 'mongoose'

export interface IWaterLog extends Document {
  userId: mongoose.Types.ObjectId
  date: string
  amountMl: number
  loggedAt: Date
}

const WaterLogSchema = new Schema<IWaterLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  amountMl: { type: Number, required: true },
  loggedAt: { type: Date, default: Date.now },
})

WaterLogSchema.index({ userId: 1, date: 1 })

export const WaterLog =
  mongoose.models.WaterLog ?? mongoose.model<IWaterLog>('WaterLog', WaterLogSchema)
