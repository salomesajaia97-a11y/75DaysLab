import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { MODEL_REGISTRY, isValidModelSlug } from '@/lib/admin-models'
import mongoose from 'mongoose'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ model: string; id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { model, id } = await params
  if (!isValidModelSlug(model))
    return NextResponse.json({ error: 'Unknown model' }, { status: 404 })
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  await connectDB()
  const doc = await MODEL_REGISTRY[model].model.findById(id).lean()
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ doc })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ model: string; id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { model, id } = await params
  if (!isValidModelSlug(model))
    return NextResponse.json({ error: 'Unknown model' }, { status: 404 })

  const meta = MODEL_REGISTRY[model]
  if (meta.readOnly)
    return NextResponse.json({ error: 'Read-only collection' }, { status: 403 })

  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const body = await req.json()
  await connectDB()

  const doc = await meta.model.findByIdAndUpdate(id, body, { new: true })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ doc })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ model: string; id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { model, id } = await params
  if (!isValidModelSlug(model))
    return NextResponse.json({ error: 'Unknown model' }, { status: 404 })

  const meta = MODEL_REGISTRY[model]
  if (meta.readOnly)
    return NextResponse.json({ error: 'Read-only collection' }, { status: 403 })

  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  await connectDB()
  await meta.model.findByIdAndDelete(id)
  return NextResponse.json({ success: true })
}
