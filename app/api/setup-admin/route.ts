import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { User } from '@/models/User'

export async function POST() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  await connectDB()

  const adminExists = await User.findOne({ role: 'admin' })
  if (adminExists) return NextResponse.json({ error: 'Admin already exists' }, { status: 403 })

  const result = await User.updateOne({ email: session.user.email }, { $set: { role: 'admin' } })
  return NextResponse.json({ ok: true, email: session.user.email, modified: result.modifiedCount })
}
