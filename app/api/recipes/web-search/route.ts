import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { findWebRecipes } from '@/lib/recipes/find'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { query?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const query = body.query?.trim()
  if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 })

  const found = await findWebRecipes(query)
  // strip sourceDomain AND imageUrl — never expose where the recipe came from.
  // imageUrl is a third-party CDN URL whose host reveals the source site, so it
  // is omitted to honor the "recipes only, no links/sources" requirement.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const recipes = found.map(({ sourceDomain: _omitDomain, imageUrl: _omitImage, ...rest }) => rest)
  return NextResponse.json({ recipes })
}
