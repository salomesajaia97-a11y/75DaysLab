import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { uploadFitnessMedia } from '@/lib/cloudinary'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const allowed = ['image/gif', 'application/json', 'text/plain']
  if (!allowed.includes(file.type) && !file.name.endsWith('.json') && !file.name.endsWith('.gif'))
    return NextResponse.json({ error: 'Only GIF and JSON (Lottie) files allowed' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  try {
    const { url, publicId } = await uploadFitnessMedia(buffer, file.name)
    return NextResponse.json({ url, publicId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
