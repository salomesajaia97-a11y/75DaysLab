import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { CycleLog } from '@/models/CycleLog'
import { predictCycle } from '@/lib/cycle-predictor'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const logs = await CycleLog.find({ userId: session.user.id })
    .sort({ startDate: -1 })
    .limit(6)

  if (!logs.length) return NextResponse.json({ logs: [], predictions: null })

  const avgCycle =
    logs.length > 1
      ? Math.round(
          logs.slice(0, -1).reduce((sum, l, i) => {
            const days =
              (l.startDate.getTime() - logs[i + 1].startDate.getTime()) / 86400000
            return sum + days
          }, 0) / (logs.length - 1)
        )
      : 28

  const predictions = predictCycle(logs[0].startDate, avgCycle)

  return NextResponse.json({ logs, predictions })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { startDate } = await req.json()
  if (!startDate) return NextResponse.json({ error: 'startDate required' }, { status: 400 })

  await connectDB()
  const log = await CycleLog.create({
    userId: session.user.id,
    startDate: new Date(startDate),
  })

  return NextResponse.json(log, { status: 201 })
}
