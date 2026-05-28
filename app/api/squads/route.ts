import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { Squad } from '@/models/Squad'

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const squads = await Squad.find({ members: session.user.id }).populate('members', 'username')

  return NextResponse.json(squads)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  await connectDB()
  let code = generateCode()
  while (await Squad.findOne({ code })) code = generateCode()

  const squad = await Squad.create({
    name: name.trim(),
    code,
    creatorId: session.user.id,
    members: [session.user.id],
  })

  return NextResponse.json(squad, { status: 201 })
}
