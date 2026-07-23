import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { uploadPhoto, deletePhoto } from '@/lib/cloudinary'
import { parseFoodPhoto } from '@/lib/ai'
import { validateImage, MAX_UPLOAD_BYTES } from '@/lib/image-validation'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Reject oversized bodies from Content-Length before buffering anything.
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
    return NextResponse.json({ error: 'Invalid upload. Please try again.' }, { status: 400 })
  }

  const file = form.get('image')
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Image required' }, { status: 400 })
  }

  // Validate from the file's actual bytes — File.type and filename are never
  // trusted. Rejects renamed non-images, corrupt files, unsupported formats,
  // oversized files, and out-of-range dimensions before anything is uploaded.
  const buffer = Buffer.from(await file.arrayBuffer())
  const check = validateImage(buffer)
  if (!check.ok) {
    const status =
      check.reason === 'too-large' ? 413 : check.reason === 'unsupported-format' ? 415 : 422
    return NextResponse.json({ error: check.message }, { status })
  }

  let photoUrl: string
  let publicId: string
  try {
    ;({ url: photoUrl, publicId } = await uploadPhoto(buffer, 'foodlogs'))
  } catch (err) {
    console.error('[nutrition/scan] upload failed:', err instanceof Error ? err.message : String(err))
    return NextResponse.json(
      { error: 'Could not process your photo right now. Please try again.' },
      { status: 502 }
    )
  }

  // Analyze. On any failure — a thrown provider error or an unusable result
  // (no food detected / unparseable) — destroy the just-uploaded asset so a
  // scan the client will never persist does not leak storage, and return a
  // generic message so provider internals are never exposed.
  let macros: Awaited<ReturnType<typeof parseFoodPhoto>> = null
  try {
    macros = await parseFoodPhoto(photoUrl)
  } catch (err) {
    console.error('[nutrition/scan] analysis failed:', err instanceof Error ? err.message : String(err))
    macros = null
  }

  if (!macros) {
    try {
      await deletePhoto(publicId)
    } catch (cleanupErr) {
      console.error('[nutrition/scan] cleanup failed:', cleanupErr)
    }
    return NextResponse.json(
      { error: "Couldn't analyze that photo. Try again or describe it." },
      { status: 422 }
    )
  }

  // Success: the asset is intentionally retained — the food-log save flow
  // persists photoUrl alongside the entry.
  return NextResponse.json({ photoUrl, macros })
}
