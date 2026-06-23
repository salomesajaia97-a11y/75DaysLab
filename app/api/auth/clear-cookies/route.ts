import { NextResponse } from 'next/server'

// Clears stale authjs cookies that cause "no matching decryption secret" errors
export async function GET() {
  const res = NextResponse.redirect(
    new URL('/login', process.env.NEXTAUTH_URL ?? 'http://localhost:3000')
  )

  const authCookies = [
    'authjs.session-token',
    'authjs.state',
    'authjs.nonce',
    'authjs.callback-url',
    'authjs.pkce.code_verifier',
    'authjs.csrf-token',
    '__Host-authjs.csrf-token',
    'next-auth.session-token',
    'next-auth.state',
    'next-auth.csrf-token',
    '__Host-next-auth.csrf-token',
  ]

  for (const name of authCookies) {
    res.cookies.set(name, '', { maxAge: 0, path: '/' })
  }

  return res
}
