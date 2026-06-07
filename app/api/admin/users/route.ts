import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { User } from '@/models/User'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()

  const users = await User.find({})
    .select('username email role onboardingComplete createdAt')
    .sort({ createdAt: -1 })
    .lean()

  return NextResponse.json({
    users: users.map((u) => ({
      id: String(u._id),
      username: u.username,
      email: u.email,
      role: u.role ?? 'user',
      onboardingComplete: u.onboardingComplete,
      createdAt: u.createdAt,
    })),
    total: users.length,
  })
}
