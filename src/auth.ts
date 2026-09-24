// Auth.js (NextAuth v5) server configuration.
// Real accounts only: email + password, with optional Google / GitHub OAuth
// that activates only when their env vars are set.
import NextAuth from 'next-auth'
import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import { verifyCredentials } from '@/lib/users'

export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  trustHost: true,
  providers: [
    Credentials({
      name: 'Email & password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const email = String(credentials?.email ?? '').trim().toLowerCase()
          const password = String(credentials?.password ?? '')
          if (!email || !password) return null
          const user = verifyCredentials(email, password)
          if (!user) return null
          return { id: user.id, name: user.name, email: user.email }
        } catch {
          return null
        }
      },
    }),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
    ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
      ? [
          GitHub({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string }).id ?? token.sub
        token.name = user.name ?? token.name
        token.email = user.email ?? token.email
        token.picture = user.image ?? token.picture
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string | undefined) ?? token.sub ?? ''
        if (token.name) session.user.name = token.name
        if (token.email) session.user.email = token.email
        if (token.picture) session.user.image = token.picture
      }
      return session
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

// Which auth methods the login page should offer (computed at runtime).
export type LoginProviderId = 'email' | 'google' | 'github'

export const loginProviders = (): LoginProviderId[] => [
  'email',
  ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? (['google'] as const) : []),
  ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET ? (['github'] as const) : []),
]