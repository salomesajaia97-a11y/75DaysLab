import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PATHS = [
  '/dashboard',
  '/water',
  '/journal',
  '/nutrition',
  '/cycle',
  '/photos',
  '/squads',
  '/onboarding',
]

const AUTH_PAGES = ['/login', '/register']

export async function proxy(request: NextRequest) {
  const session = await auth()
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(p + '/'))

  if (isProtected && !session?.user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthPage && session?.user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
