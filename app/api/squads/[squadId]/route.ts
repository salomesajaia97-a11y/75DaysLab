import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { Squad } from '@/models/Squad'

// A generic 404 is used for "malformed id", "does not exist", and "you are not a
// member" alike, so an outsider can never confirm a private squad's existence.
function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ squadId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { squadId } = await params
  if (!mongoose.isValidObjectId(squadId)) return notFound()

  await connectDB()
  // Membership is enforced in the query itself: a non-member (or a nonexistent
  // id) yields null, indistinguishable from "not found".
  const squad = await Squad.findOne({ _id: squadId, members: session.user.id }).populate(
    'members',
    'username'
  )

  if (!squad) return notFound()
  return NextResponse.json(squad)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ squadId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { squadId } = await params
  if (!mongoose.isValidObjectId(squadId)) return notFound()

  await connectDB()
  const squad = await Squad.findById(squadId)

  if (!squad) return notFound()
  if (squad.creatorId.toString() !== session.user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await squad.deleteOne()
  return NextResponse.json({ success: true })
}
