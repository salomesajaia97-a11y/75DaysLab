import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { MODEL_REGISTRY, isValidModelSlug } from '@/lib/admin-models'
import { escapeRegex } from '@/lib/security'

const PAGE_SIZE = 20

export async function GET(
  req: Request,
  { params }: { params: Promise<{ model: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { model } = await params
  if (!isValidModelSlug(model))
    return NextResponse.json({ error: 'Unknown model' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const search = searchParams.get('search') ?? ''
  const sortField = searchParams.get('sort') ?? 'createdAt'
  const sortDir = searchParams.get('dir') === 'asc' ? 1 : -1

  const meta = MODEL_REGISTRY[model]
  await connectDB()

  // Escape user-controlled search text so it matches literally (no regex
  // injection / ReDoS), even though this route is admin-gated.
  const query = search
    ? { [meta.searchField]: { $regex: escapeRegex(search), $options: 'i' } }
    : {}

  const [total, docs] = await Promise.all([
    meta.model.countDocuments(query),
    meta.model
      .find(query)
      .sort({ [sortField]: sortDir })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
  ])

  return NextResponse.json({
    docs,
    total,
    page,
    pages: Math.ceil(total / PAGE_SIZE),
    readOnly: meta.readOnly,
  })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ model: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { model } = await params
  if (!isValidModelSlug(model))
    return NextResponse.json({ error: 'Unknown model' }, { status: 404 })

  const meta = MODEL_REGISTRY[model]
  if (meta.readOnly)
    return NextResponse.json({ error: 'Read-only collection' }, { status: 403 })

  const body = await req.json()
  await connectDB()

  const doc = await meta.model.create(body)
  return NextResponse.json({ doc }, { status: 201 })
}
