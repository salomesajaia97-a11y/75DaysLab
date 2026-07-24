import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { Photo } from '@/models/Photo'
import { uploadPhoto, deletePhoto } from '@/lib/cloudinary'
import { recomputeDailyLog } from '@/lib/recompute-daily-log'
import { resolveLogicalToday } from '@/lib/logical-day-context'
import { validateImage, MAX_UPLOAD_BYTES } from '@/lib/image-validation'

/** Sanity bound on the challenge day number. */
const MAX_DAY_NUMBER = 1000

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  // Return an explicit, minimal shape. Internal fields (publicId, _id, userId,
  // uploadedAt, date, __v) are never exposed — the UI consumes only day + url.
  const photos = await Photo.find({ userId: session.user.id })
    .sort({ dayNumber: 1 })
    .select('dayNumber url -_id')
    .lean<{ dayNumber: number; url: string }[]>()

  return NextResponse.json(photos.map((p) => ({ dayNumber: p.dayNumber, url: p.url })))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !mongoose.Types.ObjectId.isValid(session.user.id))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Reject oversized bodies from the Content-Length header before reading any
  // bytes, so a huge upload never gets buffered into memory. (The definitive
  // size check happens again on the actual buffer below — headers are untrusted.)
  const declaredLength = Number(req.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES + 1024) {
    const mb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))
    return NextResponse.json(
      { error: `Image is too large. Maximum size is ${mb} MB.` },
      { status: 413 }
    )
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    // Malformed multipart body — never let it bubble into a 500.
    return NextResponse.json({ error: 'Invalid upload. Please try again.' }, { status: 400 })
  }

  const file = form.get('photo')
  const dayNumber = Number(form.get('dayNumber'))

  if (!file || typeof file === 'string')
    return NextResponse.json({ error: 'Missing photo' }, { status: 400 })
  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > MAX_DAY_NUMBER)
    return NextResponse.json({ error: 'Invalid dayNumber' }, { status: 400 })

  // Validate from the file's actual bytes — the client-provided File.type and
  // filename are never trusted. Rejects renamed non-images, corrupt files,
  // unsupported formats, oversized files, and out-of-range dimensions.
  const buffer = Buffer.from(await file.arrayBuffer())
  const check = validateImage(buffer)
  if (!check.ok) {
    // 413 for size, 415 for format, 422 for everything else that is a bad payload.
    const status =
      check.reason === 'too-large' ? 413 : check.reason === 'unsupported-format' ? 415 : 422
    return NextResponse.json({ error: check.message }, { status })
  }

  let url: string
  let publicId: string
  try {
    ;({ url, publicId } = await uploadPhoto(buffer, `75dayslab/${session.user.id}`))
  } catch (err) {
    // Storage/network failure — log the detail server-side, return a generic
    // message so provider internals are never leaked to the client.
    console.error('[POST /api/photos] cloudinary upload failed:', err)
    return NextResponse.json(
      { error: 'Could not save your photo right now. Please try again.' },
      { status: 502 }
    )
  }

  try {
    await connectDB()
    // One instant, reused for the event timestamp AND the logical day key.
    // `dayNumber` (client-supplied challenge day) is a separate concept, untouched.
    const now = new Date()
    const clock = () => now
    const date = await resolveLogicalToday(session.user.id, clock)
    // Upsert on the unique {userId,dayNumber} index: a second upload for the same
    // day replaces the existing record rather than creating a duplicate. `new: false`
    // returns the PRE-update doc (null on first upload) so we can clean up the old
    // Cloudinary asset it pointed at.
    const prev = await Photo.findOneAndUpdate(
      { userId: session.user.id, dayNumber },
      { url, publicId, uploadedAt: now, date },
      { upsert: true, new: false }
    )

    // Replacement: destroy the now-orphaned previous asset so storage does not
    // leak on every re-upload (non-fatal — the new photo is already saved).
    if (prev?.publicId && prev.publicId !== publicId) {
      try {
        await deletePhoto(prev.publicId)
      } catch (cleanupErr) {
        console.error('[POST /api/photos] orphan cleanup failed:', cleanupErr)
      }
    }

    // Recompute the daily completion spine (non-fatal — the photo is already saved).
    try {
      await recomputeDailyLog(session.user.id, date, undefined, clock)
    } catch (recomputeErr) {
      console.error('[POST /api/photos] recomputeDailyLog failed:', recomputeErr)
    }

    return NextResponse.json({ url }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/photos] persistence failed:', err)
    // The upload succeeded but the DB record was never written — destroy the
    // now-orphaned asset so a failed persist does not leak storage (non-fatal).
    try {
      await deletePhoto(publicId)
    } catch (cleanupErr) {
      console.error('[POST /api/photos] post-failure cleanup failed:', cleanupErr)
    }
    return NextResponse.json(
      { error: 'Could not save your photo right now. Please try again.' },
      { status: 500 }
    )
  }
}
