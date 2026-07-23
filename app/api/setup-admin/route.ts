import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { User } from '@/models/User'
import { normalizeEmail } from '@/lib/validation/auth'
import { verifyBearerSecret } from '@/lib/security'

// Generic denial. Every authorization-class failure — secret not configured,
// empty/wrong/malformed secret, or an admin already existing — returns the same
// response so a caller can never probe which check failed or whether an admin
// exists.
function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

/**
 * First-admin bootstrap.
 *
 * Design (Option B): promotion requires a dedicated server-only secret,
 * ADMIN_BOOTSTRAP_SECRET, supplied via the `Authorization: Bearer <secret>`
 * header (never a query parameter), AND is only usable while zero admins exist.
 * If the secret is not configured the endpoint is effectively disabled and
 * denies every request. This closes the previous hole where any authenticated
 * user could self-promote whenever no admin row happened to exist.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Server-only bootstrap secret. Read only from the Authorization header.
  if (!verifyBearerSecret(req.headers.get('authorization'), process.env.ADMIN_BOOTSTRAP_SECRET)) {
    return forbidden()
  }

  await connectDB()

  // Defense in depth: never usable once an admin exists (returned as the same
  // generic 403 so admin existence is not observable).
  const adminExists = await User.findOne({ role: 'admin' })
  if (adminExists) return forbidden()

  // Query by the canonical (trimmed + lowercased) email so the lookup matches
  // the stored form regardless of the session email's casing.
  const email = normalizeEmail(session.user.email)
  const result = await User.updateOne({ email }, { $set: { role: 'admin' } })
  return NextResponse.json({ ok: true, modified: result.modifiedCount })
}
