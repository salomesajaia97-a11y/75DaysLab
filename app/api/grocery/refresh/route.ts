// app/api/grocery/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { GroceryPrice } from '@/models/GroceryPrice'
import { REFRESH_ADAPTERS } from '@/lib/grocery'
import type { Retailer } from '@/lib/grocery/types'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { retailer?: Retailer; term?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { retailer, term } = body
  if (!retailer || !REFRESH_ADAPTERS[retailer] || !term?.trim()) {
    return NextResponse.json({ error: 'retailer + term required' }, { status: 400 })
  }

  await connectDB()
  const products = await REFRESH_ADAPTERS[retailer].refreshOne(term.trim())
  for (const p of products) {
    await GroceryPrice.updateOne(
      { retailer: p.retailer, sourceUrl: p.sourceUrl },
      { $set: { productName: p.productName, searchText: p.productName.toLowerCase().trim(), price: p.price, unit: p.unit, scrapedAt: new Date() } },
      { upsert: true },
    )
  }
  const cheapest = products.sort((a, b) => a.price - b.price)[0] ?? null
  return NextResponse.json({ refreshed: products.length, cheapest })
}
