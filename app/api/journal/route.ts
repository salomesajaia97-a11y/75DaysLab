import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { JournalEntry } from '@/models/JournalEntry'
import { recomputeDailyLog } from '@/lib/recompute-daily-log'

/** Sanity bound on pages read (data hygiene). */
const MAX_PAGES = 100_000

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const date = req.nextUrl.searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const entry = await JournalEntry.findOne({ userId: session.user.id, date })

  return NextResponse.json(entry ?? null)
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
  const date = new Date().toISOString().split('T')[0]
  const entry = await JournalEntry.findOneAndUpdate(
    { userId: session.user.id, date },
    { bookTitle: bookTitle.trim(), pagesRead, notes: notes ?? '' },
    { upsert: true, new: true }
  )

  // Update the daily completion spine (non-fatal — the journal entry is already saved).
  try {
    await recomputeDailyLog(session.user.id, date)
  } catch (err) {
    console.error('[POST /api/journal] recomputeDailyLog failed:', err)
  }

  return NextResponse.json(entry, { status: 201 })
}
