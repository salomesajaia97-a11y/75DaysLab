import mongoose, { Schema, Document } from 'mongoose'

export interface IJournalEntry extends Document {
  userId: mongoose.Types.ObjectId
  date: string
  bookTitle: string
  pagesRead: number
  notes: string
  createdAt: Date
  updatedAt: Date
}

const JournalEntrySchema = new Schema<IJournalEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    bookTitle: { type: String, required: true },
    pagesRead: { type: Number, required: true, min: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
)

JournalEntrySchema.index({ userId: 1, date: 1 })

export const JournalEntry =
  mongoose.models.JournalEntry ??
  mongoose.model<IJournalEntry>('JournalEntry', JournalEntrySchema)
