// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { readUserProfile } from '../../../common/userProfile'

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.userId = profile.sub
      }
      if (token.userId) {
        try {
          const userProfile = await readUserProfile(token.userId)
          token.username = userProfile?.username || null
        } catch {
          token.username = null
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId
      if (token.username) session.user.username = token.username
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: false, domain: process.env.NEXTAUTH_COOKIE_DOMAIN },
    },
    callbackUrl: {
      name: 'next-auth.callback-url',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: false, domain: process.env.NEXTAUTH_COOKIE_DOMAIN },
    },
    csrfToken: {
      name: 'next-auth.csrf-token',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: false, domain: process.env.NEXTAUTH_COOKIE_DOMAIN },
    },
    state: {
      name: 'next-auth.state',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: false, maxAge: 900, domain: process.env.NEXTAUTH_COOKIE_DOMAIN },
    },
    pkceCodeVerifier: {
      name: 'next-auth.pkce.code_verifier',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: false, maxAge: 900, domain: process.env.NEXTAUTH_COOKIE_DOMAIN },
    },
  },
}

export default NextAuth(authOptions)
