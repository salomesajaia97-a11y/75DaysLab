import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { Plan } from '@/models/Plan'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
  const plans = await Plan.find({}).sort({ createdAt: 1 }).lean()
  return NextResponse.json({ plans })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, slug, price, yearlyPrice, features, limits, isActive, stripePriceId } = body

  if (!name || !slug)
    return NextResponse.json({ error: 'name and slug required' }, { status: 400 })

  await connectDB()

  const existing = await Plan.findOne({ slug })
  if (existing) return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })

  const plan = await Plan.create({ name, slug, price, yearlyPrice, features, limits, isActive, stripePriceId })
  return NextResponse.json({ plan }, { status: 201 })
}
