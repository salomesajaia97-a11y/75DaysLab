import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongoose'
import { User } from '@/models/User'
import { authConfig } from '@/lib/auth.config'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
    }
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
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
          if (!user) return null

          const passwordMatch = await bcrypt.compare(
            String(credentials.password),
            user.passwordHash
          )
          if (!passwordMatch) return null

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.username,
          }
        } catch {
          return null
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.name = user.name
      }
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      if (token.name) session.user.name = token.name as string
      return session
    },
  },
})
