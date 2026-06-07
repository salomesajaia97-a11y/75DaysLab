import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  })

  const { pathname } = request.nextUrl
  const isLoggedIn = !!token
  const role = (token as Record<string, unknown> | null)?.role as string | undefined

  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')
  const isProtected = [
    '/dashboard', '/water', '/journal', '/nutrition',
    '/cycle', '/photos', '/squads', '/onboarding', '/fitness',
  ].some((p) => pathname === p || pathname.startsWith(p + '/'))
  const isAuthPage = ['/login', '/register'].some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )

  if (isAdminRoute) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', request.url))
    if (role !== 'admin') return NextResponse.redirect(new URL('/dashboard', request.url))
    return NextResponse.next()
  }
  if (isProtected && !isLoggedIn) return NextResponse.redirect(new URL('/login', request.url))
  if (isAuthPage && isLoggedIn) return NextResponse.redirect(new URL('/dashboard', request.url))
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
