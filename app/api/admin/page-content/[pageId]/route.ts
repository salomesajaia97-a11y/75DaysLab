import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { PageContent } from '@/models/PageContent'
import { PAGE_DEFAULTS } from '@/lib/page-content-defaults'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { pageId } = await params
  const defaults = PAGE_DEFAULTS[pageId]
  if (!defaults) return NextResponse.json({ error: 'Unknown page' }, { status: 404 })

  await connectDB()

  const doc = await PageContent.findOne({ pageId }).lean()
  if (!doc) return NextResponse.json({ pageId, sections: defaults, updatedAt: null })

  return NextResponse.json({ pageId, sections: doc.sections, updatedAt: doc.updatedAt })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { pageId } = await params
  const defaults = PAGE_DEFAULTS[pageId]
  if (!defaults) return NextResponse.json({ error: 'Unknown page' }, { status: 404 })

  const body = await req.json()
  const { sectionId, fields } = body
  if (!sectionId || !Array.isArray(fields))
    return NextResponse.json({ error: 'sectionId and fields required' }, { status: 400 })

  await connectDB()

  let doc = await PageContent.findOne({ pageId })
  if (!doc) {
    doc = await PageContent.create({ pageId, sections: defaults })
  }

  const sectionIndex = doc.sections.findIndex((s: { sectionId: string }) => s.sectionId === sectionId)
  if (sectionIndex === -1)
    return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc.sections[sectionIndex].fields = fields as any
  await doc.save()

  return NextResponse.json({ pageId, sections: doc.sections, updatedAt: doc.updatedAt })
}
