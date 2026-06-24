import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { uploadPhoto } from '@/lib/cloudinary'
import { parseFoodPhoto } from '@/lib/ai'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('image')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Image required' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  let photoUrl: string
  try {
    const up = await uploadPhoto(buffer, 'foodlogs')
    photoUrl = up.url
  } catch (err) {
    console.error('[nutrition/scan] upload', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Upload failed' }, { status: 502 })
  }

  const macros = await parseFoodPhoto(photoUrl)
  return NextResponse.json({ photoUrl, macros })
}
