import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongoose'
import { User } from '@/models/User'
import { validateRegister } from '@/lib/validation/auth'

export async function POST(req: Request) {
  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Server-side validation + normalization runs BEFORE any DB access.
    const result = validateRegister(body as Record<string, unknown>)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    const { username, email, password } = result.value

    await connectDB()

    // Uniqueness check uses the normalized (trimmed + lowercased) email.
    const existing = await User.findOne({
      $or: [{ email }, { username }],
    })

    if (existing) {
      const field = existing.email === email ? 'Email' : 'Username'
      return NextResponse.json({ error: `${field} already taken` }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await User.create({ username, email, passwordHash })

    return NextResponse.json(
      { id: user._id.toString(), username: user.username, email: user.email },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POST /api/auth/register]', err)
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }
}
