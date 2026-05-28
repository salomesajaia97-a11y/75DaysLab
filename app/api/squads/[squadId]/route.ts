import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { Squad } from '@/models/Squad'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ squadId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { squadId } = await params
  await connectDB()
  const squad = await Squad.findById(squadId).populate('members', 'username')

  if (!squad) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(squad)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ squadId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { squadId } = await params
  await connectDB()
  const squad = await Squad.findById(squadId)

  if (!squad) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (squad.creatorId.toString() !== session.user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await squad.deleteOne()
  return NextResponse.json({ success: true })
}
