import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { JournalEntry } from '@/models/JournalEntry'
import { recomputeDailyLog } from '@/lib/recompute-daily-log'
import { resolveLogicalToday } from '@/lib/logical-day-context'
import { isValidCivilDate } from '@/lib/date-key'

/** Sanity bound on pages read (data hygiene). */
const MAX_PAGES = 100_000

export async function GET(req: NextRequest) {
  const session = await auth()
  // The session id is the ONLY owner identity. It is validated as an ObjectId
  // here (as POST already did) so a malformed session can never reach the query
  // and surface a driver cast error.
  if (!session?.user?.id || !mongoose.Types.ObjectId.isValid(session.user.id))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  // Reject a malformed browse key before it ever reaches the query.
  const requested = req.nextUrl.searchParams.get('date')
  if (requested !== null && !isValidCivilDate(requested))
    return NextResponse.json({ error: 'Invalid date', code: 'invalid_date' }, { status: 400 })

  try {
    await connectDB()
    // Default to the canonical logical "today" (challenge/user timezone + version)
    // instead of a raw UTC key. An explicit ?date= is a client-supplied browse key
    // and passes through unchanged — query semantics are otherwise untouched.
    const today = await resolveLogicalToday(userId)
    const date = requested ?? today
    // Scoped by { userId, date } — a client-supplied userId is never consulted.
    const entry = await JournalEntry.findOne({ userId, date })

    return NextResponse.json(entry ?? null)
  } catch (err) {
    console.error('[GET /api/journal] read failed:', err)
    return NextResponse.json(
      { error: 'Could not load the reading log', code: 'read_failed' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !mongoose.Types.ObjectId.isValid(session.user.id))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookTitle, pagesRead, notes } = await req.json()
  if (typeof bookTitle !== 'string' || !bookTitle.trim())
    return NextResponse.json({ error: 'Book title required' }, { status: 400 })
  if (typeof pagesRead !== 'number' || !Number.isFinite(pagesRead) || pagesRead < 10 || pagesRead > MAX_PAGES)
    return NextResponse.json({ error: 'Minimum 10 pages required' }, { status: 400 })
  if (notes !== undefined && typeof notes !== 'string')
    return NextResponse.json({ error: 'Invalid notes' }, { status: 400 })

  await connectDB()
  const now = new Date()
  const clock = () => now
  const date = await resolveLogicalToday(session.user.id, clock)
  // Explicit `$set` (never a replacement document): a reading save must only
  // touch the three reading fields and must leave this user's reflection half
  // — mood/title/reflection/gratitude/tomorrowFocus — untouched. Mongoose would
  // wrap a plain object in $set today, but stating it removes the chance that a
  // later `overwrite`/replace change silently wipes the reflection.
  const entry = await JournalEntry.findOneAndUpdate(
    { userId: session.user.id, date },
    { $set: { bookTitle: bookTitle.trim(), pagesRead, notes: notes ?? '' } },
    { upsert: true, returnDocument: 'after' }
  )

  // Update the daily completion spine (non-fatal — the journal entry is already saved).
  try {
    await recomputeDailyLog(session.user.id, date, undefined, clock)
  } catch (err) {
    console.error('[POST /api/journal] recomputeDailyLog failed:', err)
  }

  return NextResponse.json(entry, { status: 201 })
}
