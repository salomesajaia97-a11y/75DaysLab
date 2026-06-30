import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { Photo } from '@/models/Photo'
import { uploadPhoto } from '@/lib/cloudinary'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const photos = await Photo.find({ userId: session.user.id }).sort({ dayNumber: 1 })

  return NextResponse.json(photos)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('photo') as File
  const dayNumber = Number(form.get('dayNumber'))

  if (!file || !dayNumber)
    return NextResponse.json({ error: 'Missing photo or dayNumber' }, { status: 400 })

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const { url, publicId } = await uploadPhoto(buffer, `75dayslab/${session.user.id}`)

    await connectDB()
    const photo = await Photo.findOneAndUpdate(
      { userId: session.user.id, dayNumber },
      { url, publicId, uploadedAt: new Date() },
      { upsert: true, new: true }
    )

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
