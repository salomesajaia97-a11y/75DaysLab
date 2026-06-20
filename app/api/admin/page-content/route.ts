import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { PageContent } from '@/models/PageContent'
import { PAGE_DEFAULTS } from '@/lib/page-content-defaults'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()

  const pageIds = Object.keys(PAGE_DEFAULTS)
  const docs = await PageContent.find({ pageId: { $in: pageIds } })
    .select('pageId updatedAt')
    .lean()

  const docsMap: Record<string, Date | null> = {}
  docs.forEach((d) => { docsMap[d.pageId] = d.updatedAt })

  const pages = pageIds.map((pageId) => ({
    pageId,
    updatedAt: docsMap[pageId] ?? null,
  }))

  return NextResponse.json({ pages })
}
