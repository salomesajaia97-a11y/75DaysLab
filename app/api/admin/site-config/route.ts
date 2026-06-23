import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { SiteConfig } from '@/models/SiteConfig'
import { DEFAULT_THEME } from '@/lib/site-config'

export async function GET() {
  try {
    await connectDB()
    const doc = await SiteConfig.findOne({}).lean()
    return NextResponse.json({ theme: doc?.theme ?? DEFAULT_THEME })
  } catch {
    return NextResponse.json({ theme: DEFAULT_THEME })
  }
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { theme } = body

  if (!theme) return NextResponse.json({ error: 'Missing theme' }, { status: 400 })

  await connectDB()

  const doc = await SiteConfig.findOneAndUpdate(
    {},
    { theme, updatedBy: session.user.id },
    { upsert: true, new: true }
  )

  revalidateTag('site-config')
  return NextResponse.json({ theme: doc.theme })
}
