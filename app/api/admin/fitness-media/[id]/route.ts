import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { FitnessMedia } from '@/models/FitnessMedia'
import { deleteFitnessMedia } from '@/lib/cloudinary'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  await connectDB()
  const item = await FitnessMedia.findById(id)
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (item.publicId) {
    const isRaw = item.type === 'lottie'
    try { await deleteFitnessMedia(item.publicId, isRaw) } catch { /* ignore Cloudinary errors */ }
  }

  await item.deleteOne()
  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  await connectDB()
  const item = await FitnessMedia.findByIdAndUpdate(id, body, { new: true })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(item)
}
