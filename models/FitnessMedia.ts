import mongoose, { Schema, type Document, type Model } from 'mongoose'

export type FitnessMediaType = 'video' | 'gif' | 'lottie'
export type FitnessMediaCategory = 'full' | 'core' | 'upper' | 'lower' | 'cardio' | 'yoga'

export interface IFitnessMedia extends Document {
  title: string
  type: FitnessMediaType
  url: string
  publicId?: string
  category: FitnessMediaCategory
  order: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const FitnessMediaSchema = new Schema<IFitnessMedia>(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ['video', 'gif', 'lottie'], required: true },
    url: { type: String, required: true },
    publicId: { type: String },
    category: {
      type: String,
      enum: ['full', 'core', 'upper', 'lower', 'cardio', 'yoga'],
      required: true,
    },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

FitnessMediaSchema.index({ category: 1, order: 1 })

export const FitnessMedia: Model<IFitnessMedia> =
  (mongoose.models.FitnessMedia as Model<IFitnessMedia>) ||
  mongoose.model<IFitnessMedia>('FitnessMedia', FitnessMediaSchema)
