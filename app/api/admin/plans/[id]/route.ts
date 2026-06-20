import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { Plan } from '@/models/Plan'
import { User } from '@/models/User'
import mongoose from 'mongoose'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const body = await req.json()
  await connectDB()

  const plan = await Plan.findByIdAndUpdate(id, body, { new: true })
  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ plan })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  await connectDB()

  const userCount = await User.countDocuments({ planId: id })
  if (userCount > 0)
    return NextResponse.json(
      { error: `Cannot delete: ${userCount} user${userCount > 1 ? 's' : ''} on this plan` },
      { status: 409 }
    )

  await Plan.findByIdAndDelete(id)
  return NextResponse.json({ success: true })
}
