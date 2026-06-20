import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  username: string
  email: string
  passwordHash?: string
  age?: number
  gender?: 'male' | 'female' | 'other'
  heightCm?: number
  weightKg?: number
  goal?: 'lose' | 'gain' | 'maintain' | 'healthy'
  focusArea?: 'nutrition' | 'workout' | 'sleep' | 'other'
  city?: string
  onboardingComplete: boolean
  role: 'user' | 'admin'
  planId?: mongoose.Types.ObjectId
  planAssignedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    age: Number,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    heightCm: Number,
    weightKg: Number,
    goal: { type: String, enum: ['lose', 'gain', 'maintain', 'healthy'] },
    focusArea: { type: String, enum: ['nutrition', 'workout', 'sleep', 'other'] },
    city: { type: String },
    onboardingComplete: { type: Boolean, default: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', default: null },
    planAssignedAt: { type: Date },
  },
  { timestamps: true }
)

export const User = mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema)
