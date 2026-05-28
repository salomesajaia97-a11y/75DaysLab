import mongoose, { Schema, Document } from 'mongoose'

export interface ISquad extends Document {
  name: string
  code: string
  creatorId: mongoose.Types.ObjectId
  members: mongoose.Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const SquadSchema = new Schema<ISquad>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

export const Squad =
  mongoose.models.Squad ?? mongoose.model<ISquad>('Squad', SquadSchema)
