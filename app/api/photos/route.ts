import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { Photo } from '@/models/Photo'
import { uploadPhoto } from '@/lib/cloudinary'
import { recomputeDailyLog } from '@/lib/recompute-daily-log'

/** Sanity bound on the challenge day number. */
const MAX_DAY_NUMBER = 1000

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const photos = await Photo.find({ userId: session.user.id }).sort({ dayNumber: 1 })

  return NextResponse.json(photos)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !mongoose.Types.ObjectId.isValid(session.user.id))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('photo') as File
  const dayNumber = Number(form.get('dayNumber'))

  if (!file || typeof file === 'string')
    return NextResponse.json({ error: 'Missing photo' }, { status: 400 })
  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > MAX_DAY_NUMBER)
    return NextResponse.json({ error: 'Invalid dayNumber' }, { status: 400 })

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const { url, publicId } = await uploadPhoto(buffer, `75dayslab/${session.user.id}`)

    await connectDB()
    const date = new Date().toISOString().split('T')[0]
    const photo = await Photo.findOneAndUpdate(
      { userId: session.user.id, dayNumber },
      { url, publicId, uploadedAt: new Date(), date },
      { upsert: true, new: true }
    )

    // Update the daily completion spine (non-fatal — the photo is already saved).
    try {
      await recomputeDailyLog(session.user.id, date)
    } catch (recomputeErr) {
      console.error('[POST /api/photos] recomputeDailyLog failed:', recomputeErr)
    }

    return NextResponse.json({ url: photo.url }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/photos] failed:', err)
    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : typeof err === 'string'
            ? err
            : JSON.stringify(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
