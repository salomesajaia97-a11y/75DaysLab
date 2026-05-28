import mongoose, { Schema, Document } from 'mongoose'

export interface IPhoto extends Document {
  userId: mongoose.Types.ObjectId
  dayNumber: number
  url: string
  publicId: string
  uploadedAt: Date
}

const PhotoSchema = new Schema<IPhoto>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  dayNumber: { type: Number, required: true },
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
})

PhotoSchema.index({ userId: 1, dayNumber: 1 }, { unique: true })

export const Photo =
  mongoose.models.Photo ?? mongoose.model<IPhoto>('Photo', PhotoSchema)
