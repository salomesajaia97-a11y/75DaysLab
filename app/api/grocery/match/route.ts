// app/api/grocery/match/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { matchIngredients, buildBaskets } from '@/lib/grocery/match'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { ingredients?: string[] }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const ingredients = (body.ingredients ?? []).filter(s => typeof s === 'string' && s.trim()).slice(0, 30)
  if (ingredients.length === 0) return NextResponse.json({ error: 'ingredients required' }, { status: 400 })

  await connectDB()
  const items = await matchIngredients(ingredients)
  const baskets = buildBaskets(items)
  return NextResponse.json({ items, baskets })
}
