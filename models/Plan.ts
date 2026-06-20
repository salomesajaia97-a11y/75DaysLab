import mongoose, { Schema, Document } from 'mongoose'

export interface IPlan extends Document {
  name: string
  slug: string
  price: number
  yearlyPrice: number
  features: string[]
  limits: {
    aiMessages: number
    photoStorage: number
    squadSize: number
  }
  isActive: boolean
  stripePriceId?: string
  createdAt: Date
  updatedAt: Date
}

const PlanSchema = new Schema<IPlan>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    price: { type: Number, required: true, default: 0 },
    yearlyPrice: { type: Number, default: 0 },
    features: [{ type: String }],
    limits: {
      aiMessages: { type: Number, default: 10 },
      photoStorage: { type: Number, default: 100 },
      squadSize: { type: Number, default: 5 },
    },
    isActive: { type: Boolean, default: true },
    stripePriceId: { type: String },
  },
  { timestamps: true }
)

export const Plan = mongoose.models.Plan ?? mongoose.model<IPlan>('Plan', PlanSchema)
