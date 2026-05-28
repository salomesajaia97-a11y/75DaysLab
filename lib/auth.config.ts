import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isProtected = [
        '/dashboard', '/water', '/journal', '/nutrition',
        '/cycle', '/photos', '/squads', '/onboarding',
      ].some((p) => nextUrl.pathname === p || nextUrl.pathname.startsWith(p + '/'))
      const isAuthPage = ['/login', '/register'].some(
        (p) => nextUrl.pathname === p || nextUrl.pathname.startsWith(p + '/')
      )

      if (isProtected && !isLoggedIn) return Response.redirect(new URL('/login', nextUrl))
      if (isAuthPage && isLoggedIn) return Response.redirect(new URL('/dashboard', nextUrl))
      return true
    },
  },
}
