import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { JournalEntry } from '@/models/JournalEntry'
import { resolveLogicalToday } from '@/lib/logical-day-context'
import { addDays } from '@/lib/streak'
import {
  clampHistoryDays,
  isReflectionEmpty,
  reflectionPreview,
  toReflectionDraft,
  type JournalMood,
} from '@/lib/journal'

/**
 * Bounded reflection history: a trailing window of `?days=` (default 30, max
 * 180) ending on the user's canonical logical today, newest first. Pure read —
 * never writes, never recomputes a DailyLog.
 *
 * Scoped by the authenticated userId, so one user can never see another's
 * entries. Only days that actually carry a reflection are returned; a row that
 * exists solely because a reading log was saved is not a journal entry.
 */

export interface JournalHistoryItem {
  date: string
  mood: JournalMood | null
  title: string
  preview: string
}

interface StoredEntry {
  date: string
  mood?: string
  title?: string
  reflection?: string
  gratitude?: string
  tomorrowFocus?: string
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !mongoose.Types.ObjectId.isValid(session.user.id))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  await connectDB()

  const days = clampHistoryDays(req.nextUrl.searchParams.get('days'))
  const today = await resolveLogicalToday(userId)
  const from = addDays(today, -(days - 1))

  try {
    // 'YYYY-MM-DD' keys sort lexicographically, so a string range is a correct
    // (and index-friendly) date-window filter.
    const docs = await JournalEntry.find({ userId, date: { $gte: from, $lte: today } })
      .select('date mood title reflection gratitude tomorrowFocus')
      .sort({ date: -1 })
      .limit(days)
      .lean<StoredEntry[]>()

    const entries: JournalHistoryItem[] = docs
      .map((doc) => ({ date: doc.date, draft: toReflectionDraft(doc) }))
      .filter(({ draft }) => !isReflectionEmpty(draft))
      .map(({ date, draft }) => ({
        date,
        mood: draft.mood,
        title: draft.title,
        preview: reflectionPreview(draft.reflection || draft.gratitude || draft.tomorrowFocus),
      }))

    return NextResponse.json({ today, from, to: today, days, entries })
  } catch (err) {
    console.error('[GET /api/journal/history] read failed:', err)
    return NextResponse.json(
      { error: 'Could not load journal history', code: 'read_failed' },
      { status: 500 }
    )
  }
}
