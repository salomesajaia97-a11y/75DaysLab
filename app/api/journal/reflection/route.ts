import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { JournalEntry } from '@/models/JournalEntry'
import { resolveLogicalToday } from '@/lib/logical-day-context'
import { isValidCivilDate } from '@/lib/date-key'
import {
  isReflectionEmpty,
  normalizeReflection,
  toReflectionDraft,
  type JournalValidationCode,
  type ReflectionDraft,
} from '@/lib/journal'

/**
 * Daily reflection read/write for ONE local date.
 *
 * Deliberately separate from `POST /api/journal` (the reading log): that route
 * owns `bookTitle`/`pagesRead` and recomputes the daily completion spine. This
 * route only ever `$set`s the reflection fields, so saving a reflection can
 * never change `journalCompleted`, the 3/5 Completed-Day rule, the streak, or
 * anything on the Dashboard. Both halves live on the same {userId, date} row.
 *
 * Every query is scoped by the authenticated userId — the client-supplied
 * `date` is only ever a filter key, never an identity.
 */

/** Generic, non-leaking messages. The client localizes off `code`. */
const MESSAGES: Record<JournalValidationCode, string> = {
  invalid_payload: 'Invalid request body',
  invalid_mood: 'Invalid mood',
  invalid_text: 'Invalid text field',
  too_long: 'Text is too long',
  empty: 'Nothing to save',
  invalid_date: 'Invalid date',
  future_date: 'Cannot journal a future date',
}

function fail(code: JournalValidationCode, status = 400, field?: string) {
  return NextResponse.json({ error: MESSAGES[code], code, field }, { status })
}

interface ResolvedDate {
  today: string
  date: string
}

/**
 * The logical today plus the effective target date. An explicit `date` must be
 * a real calendar day and may not be in the future; absent, it defaults to the
 * canonical logical today (challenge/user timezone + day-key version) — never a
 * raw UTC slice of the server clock.
 */
async function resolveDate(
  userId: string,
  raw: string | null
): Promise<ResolvedDate | { code: JournalValidationCode }> {
  const today = await resolveLogicalToday(userId)
  if (raw === null) return { today, date: today }
  if (!isValidCivilDate(raw)) return { code: 'invalid_date' }
  if (raw > today) return { code: 'future_date' }
  return { today, date: raw }
}

interface EntryPayload {
  today: string
  date: string
  isToday: boolean
  entry: ReflectionDraft | null
  updatedAt: string | null
  /** whether the day also has a reading log (so the UI never implies it is blank) */
  hasReading: boolean
}

/** Stored shape this route reads back. */
interface StoredEntry {
  mood?: string
  title?: string
  reflection?: string
  gratitude?: string
  tomorrowFocus?: string
  pagesRead?: number
  bookTitle?: string
  updatedAt?: Date
}

function toPayload(today: string, date: string, doc: StoredEntry | null): EntryPayload {
  const draft = doc ? toReflectionDraft(doc) : null
  // A row that exists only because a reading log was saved counts as "no
  // reflection yet", so the UI shows the empty-day state rather than a
  // misleading "saved" badge.
  const entry = draft && !isReflectionEmpty(draft) ? draft : null
  return {
    today,
    date,
    isToday: date === today,
    entry,
    updatedAt: entry && doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    hasReading: Boolean(doc && (doc.pagesRead != null || (doc.bookTitle ?? '').trim())),
  }
}

const SELECT = 'mood title reflection gratitude tomorrowFocus pagesRead bookTitle updatedAt'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !mongoose.Types.ObjectId.isValid(session.user.id))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  await connectDB()
  const resolved = await resolveDate(userId, req.nextUrl.searchParams.get('date'))
  if ('code' in resolved) return fail(resolved.code)

  try {
    const doc = await JournalEntry.findOne({ userId, date: resolved.date })
      .select(SELECT)
      .lean<StoredEntry | null>()
    return NextResponse.json(toPayload(resolved.today, resolved.date, doc))
  } catch (err) {
    console.error('[GET /api/journal/reflection] read failed:', err)
    return NextResponse.json({ error: 'Could not load the journal entry', code: 'read_failed' }, { status: 500 })
  }
}

/**
 * Create or update the reflection for one date. Idempotent upsert on the unique
 * {userId, date} index, with a single retry on a duplicate-key race, so a double
 * submit can never produce two rows for a day.
 */
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !mongoose.Types.ObjectId.isValid(session.user.id))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('invalid_payload')
  }

  const normalized = normalizeReflection(body)
  if (!normalized.ok) return fail(normalized.code, 400, normalized.field)

  await connectDB()
  const rawDate = typeof (body as Record<string, unknown>).date === 'string'
    ? ((body as Record<string, unknown>).date as string)
    : null
  const resolved = await resolveDate(userId, rawDate)
  if ('code' in resolved) return fail(resolved.code)

  // Only reflection fields are written. `mood: null` is stored as an unset so a
  // cleared mood does not linger, and the reading half is never touched.
  const { mood, ...text } = normalized.value
  const update: Record<string, unknown> = mood
    ? { $set: { ...text, mood } }
    : { $set: { ...text }, $unset: { mood: '' } }

  const filter = { userId, date: resolved.date }
  try {
    let doc = await JournalEntry.findOneAndUpdate(filter, update, {
      upsert: true,
      returnDocument: 'after',
      setDefaultsOnInsert: true,
    })
      .select(SELECT)
      .lean<StoredEntry | null>()

    if (!doc) {
      doc = await JournalEntry.findOne(filter).select(SELECT).lean<StoredEntry | null>()
    }
    return NextResponse.json(toPayload(resolved.today, resolved.date, doc))
  } catch (err) {
    if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
      // Lost the insert race — the row now exists, so a plain update succeeds.
      const doc = await JournalEntry.findOneAndUpdate(filter, update, { returnDocument: 'after' })
        .select(SELECT)
        .lean<StoredEntry | null>()
      return NextResponse.json(toPayload(resolved.today, resolved.date, doc))
    }
    console.error('[PUT /api/journal/reflection] save failed:', err)
    return NextResponse.json({ error: 'Could not save the journal entry', code: 'save_failed' }, { status: 500 })
  }
}
