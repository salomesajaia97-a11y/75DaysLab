import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { WaterLog } from '@/models/WaterLog'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const date = req.nextUrl.searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const logs = await WaterLog.find({ userId: session.user.id, date })
  const totalMl = logs.reduce((sum, l) => sum + l.amountMl, 0)

  return NextResponse.json({ totalMl, logs })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amountMl } = await req.json()
  if (!amountMl || amountMl <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

  await connectDB()
  const date = new Date().toISOString().split('T')[0]
  const log = await WaterLog.create({ userId: session.user.id, date, amountMl })

  return NextResponse.json(log, { status: 201 })
}
