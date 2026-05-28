import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  username: string
  email: string
  passwordHash: string
  age?: number
  gender?: 'male' | 'female' | 'other'
  heightCm?: number
  weightKg?: number
  goal?: 'lose' | 'gain' | 'maintain'
  focusArea?: 'nutrition' | 'workout' | 'sleep' | 'other'
  onboardingComplete: boolean
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    age: Number,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    heightCm: Number,
    weightKg: Number,
    goal: { type: String, enum: ['lose', 'gain', 'maintain'] },
    focusArea: { type: String, enum: ['nutrition', 'workout', 'sleep', 'other'] },
    onboardingComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export const User = mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema)
