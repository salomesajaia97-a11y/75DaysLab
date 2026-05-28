import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { Squad } from '@/models/Squad'
import mongoose from 'mongoose'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'Invite code required' }, { status: 400 })

  await connectDB()
  const squad = await Squad.findOne({ code: code.toUpperCase() })
  if (!squad) return NextResponse.json({ error: 'Squad not found' }, { status: 404 })

  const userId = new mongoose.Types.ObjectId(session.user.id)
  if (!squad.members.some((m: mongoose.Types.ObjectId) => m.equals(userId))) {
    squad.members.push(userId)
    await squad.save()
  }

  return NextResponse.json(squad)
}
