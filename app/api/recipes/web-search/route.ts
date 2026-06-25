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
  // strip sourceDomain — never expose where it came from
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const recipes = found.map(({ sourceDomain: _omit, ...rest }) => rest)
  return NextResponse.json({ recipes })
}
