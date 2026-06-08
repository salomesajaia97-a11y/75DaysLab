import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { User } from '@/models/User'

const ALLOWED_EMAIL = 'student8@reeducate.space'

export async function POST() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  if (session.user.email !== ALLOWED_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
  await User.updateOne({ email: ALLOWED_EMAIL }, { $set: { role: 'admin' } })
  return NextResponse.json({ ok: true, message: 'Admin role granted. Re-login to apply.' })
}
