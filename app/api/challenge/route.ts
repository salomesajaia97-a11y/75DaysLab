import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { Challenge } from '@/models/Challenge'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const challenge = await Challenge.findOne({ userId: session.user.id, isActive: true })

  return NextResponse.json(challenge ?? null)
}
