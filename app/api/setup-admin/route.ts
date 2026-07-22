import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { User } from '@/models/User'
import { normalizeEmail } from '@/lib/validation/auth'

export async function POST() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  await connectDB()

  const adminExists = await User.findOne({ role: 'admin' })
  if (adminExists) return NextResponse.json({ error: 'Admin already exists' }, { status: 403 })

  // Query by the canonical (trimmed + lowercased) email so the lookup matches
  // the stored form regardless of the session email's casing.
  const email = normalizeEmail(session.user.email)
  const result = await User.updateOne({ email }, { $set: { role: 'admin' } })
  return NextResponse.json({ ok: true, email, modified: result.modifiedCount })
}
