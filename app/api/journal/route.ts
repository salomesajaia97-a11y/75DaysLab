import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { JournalEntry } from '@/models/JournalEntry'

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
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookTitle, pagesRead, notes } = await req.json()
  if (!bookTitle || pagesRead < 10)
    return NextResponse.json({ error: 'Minimum 10 pages required' }, { status: 400 })

  await connectDB()
  const date = new Date().toISOString().split('T')[0]
  const entry = await JournalEntry.findOneAndUpdate(
    { userId: session.user.id, date },
    { bookTitle, pagesRead, notes: notes ?? '' },
    { upsert: true, new: true }
  )

  return NextResponse.json(entry, { status: 201 })
}
