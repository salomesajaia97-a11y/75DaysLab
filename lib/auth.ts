import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongoose'
import { User } from '@/models/User'
import { authConfig } from '@/lib/auth.config'

declare module 'next-auth' {
  interface User {
    role?: 'user' | 'admin'
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: 'user' | 'admin'
    }
  }
}


export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      checks: ['state'],
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        try {
          await connectDB()
          const user = await User.findOne({
            email: String(credentials.email).toLowerCase(),
          })
          if (!user || !user.passwordHash) return null

          const passwordMatch = await bcrypt.compare(
            String(credentials.password),
            user.passwordHash
          )
          if (!passwordMatch) return null

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.username,
            role: user.role ?? 'user',
          }
        } catch {
          return null
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          await connectDB()
          const existing = await User.findOne({ email: user.email })
          if (!existing) {
            const username = (user.name ?? user.email!.split('@')[0])
              .replace(/\s+/g, '_')
              .toLowerCase()
            let finalUsername = username
            let i = 1
            while (await User.findOne({ username: finalUsername })) {
              finalUsername = `${username}${i++}`
            }
            await User.create({
              username: finalUsername,
              email: user.email,
              onboardingComplete: false,
            })
          }
        } catch {
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === 'google') {
          try {
            await connectDB()
            const dbUser = await User.findOne({ email: token.email })
            if (dbUser) {
              token.id = dbUser._id.toString()
              token.name = dbUser.username
              ;(token as Record<string, unknown>).role = dbUser.role ?? 'user'
            }
          } catch {
            // DB error during JWT creation — token proceeds without DB-sourced fields
          }
        } else {
          token.id = user.id
          token.name = user.name
          ;(token as Record<string, unknown>).role = user.role ?? 'user'
        }
      }
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      if (token.name) session.user.name = token.name as string
      session.user.role = ((token as Record<string, unknown>).role ?? 'user') as 'user' | 'admin'
      return session
    },
  },
})
