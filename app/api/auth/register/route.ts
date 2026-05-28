import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongoose'
import { User } from '@/models/User'

export async function POST(req: NextRequest) {
  try {
    const { username, email, password } = await req.json()

    if (!username?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    await connectDB()

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.trim() }],
    })

    if (existing) {
      const field = existing.email === email.toLowerCase() ? 'Email' : 'Username'
      return NextResponse.json({ error: `${field} already taken` }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await User.create({
      username: username.trim(),
      email: email.toLowerCase(),
      passwordHash,
    })

    return NextResponse.json(
      { id: user._id.toString(), username: user.username, email: user.email },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POST /api/auth/register]', err)
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }
}
