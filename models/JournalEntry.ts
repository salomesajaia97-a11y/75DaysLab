import mongoose, { Schema, Document } from 'mongoose'
import { JOURNAL_FIELD_LIMITS, JOURNAL_MOODS, type JournalMood } from '@/lib/journal'

/**
 * One journal record per user per logical day. It carries TWO independent
 * halves that share the same {userId, date} row:
 *
 *  - the reading log (bookTitle / pagesRead / notes) — the existing challenge
 *    task. `pagesRead >= JOURNAL_MIN_PAGES` is what makes `journalCompleted`
 *    true in the daily completion spine. UNCHANGED by the reflection feature.
 *  - the daily reflection (mood / title / reflection / gratitude /
 *    tomorrowFocus) — written only by /api/journal/reflection and deliberately
 *    NOT an input to any completion flag.
 *
 * `bookTitle` and `pagesRead` are optional at the schema level so a
 * reflection-only day can exist; the reading API still enforces its own
 * stricter rules (title required, >= 10 pages) before writing them. A day with
 * no reading logged leaves `pagesRead` undefined, which the spine reads as
 * "no reading" — exactly as a missing document did before.
 */
export interface IJournalEntry extends Document {
  userId: mongoose.Types.ObjectId
  date: string
  bookTitle: string
  pagesRead?: number
  notes: string
  mood?: JournalMood
  title: string
  reflection: string
  gratitude: string
  tomorrowFocus: string
  createdAt: Date
  updatedAt: Date
}

const JournalEntrySchema = new Schema<IJournalEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },

    // Reading log (challenge task) — semantics unchanged.
    bookTitle: { type: String, default: '' },
    pagesRead: { type: Number, min: 0 },
    notes: { type: String, default: '' },

    // Daily reflection. Only canonical mood keys are stored; the visible labels
    // are localized in the UI and never persisted.
    mood: { type: String, enum: JOURNAL_MOODS },
    title: { type: String, default: '', trim: true, maxlength: JOURNAL_FIELD_LIMITS.title },
    reflection: { type: String, default: '', trim: true, maxlength: JOURNAL_FIELD_LIMITS.reflection },
    gratitude: { type: String, default: '', trim: true, maxlength: JOURNAL_FIELD_LIMITS.gratitude },
    tomorrowFocus: {
      type: String,
      default: '',
      trim: true,
      maxlength: JOURNAL_FIELD_LIMITS.tomorrowFocus,
    },
  },
  { timestamps: true }
)

// One entry per user per local date. Unique so a concurrent reading save and
// reflection save can never split a day across two documents.
JournalEntrySchema.index({ userId: 1, date: 1 }, { unique: true })

export const JournalEntry =
  mongoose.models.JournalEntry ??
  mongoose.model<IJournalEntry>('JournalEntry', JournalEntrySchema)
