import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { validateCredentials, getUserByEmail } from './credential-service'
import { buildAuthUser, validateAdminAccess } from './user-store-service'
import { getRepository } from '../db'
import { User } from '../db/entities/user.entity'

export const authConfig: NextAuthConfig = {
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const email = (credentials as any)?.email
          const password = (credentials as any)?.password

          // Check for QR token login flag
          const isQrLogin = password === '__QR_TOKEN_LOGIN__'

          let user: any

          if (isQrLogin) {
            // QR login - only validate email exists
            user = await getUserByEmail(email)
          } else {
            // Normal login - validate credentials
            user = await validateCredentials(email, password)

            // For normal login, restrict to ADMIN or OWNER
            if (user && !validateAdminAccess(user)) {
              console.warn(`Login denied: ${email} has no ADMIN/OWNER role`)
              return null
            }
          }

          // Return authorized user with store access
          return user ? buildAuthUser(user) : null
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard')
      const isOnAdmin = nextUrl.pathname.startsWith('/admin')
      
      if (isOnDashboard || isOnAdmin) {
        if (!isLoggedIn) return false
      }
      return true
    },
    async jwt({ token, user, trigger }) {
      // Add user info to token on sign in
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.role = user.role
        token.mustChangePassword = user.mustChangePassword
        token.colorTheme = user.colorTheme
        token.stores = user.stores
      }

      // Refresh user data when update() is called
      if (trigger === 'update' && token.id) {
        try {
          const userRepo = await getRepository(User)
          const freshUser = await userRepo.findOne({
            where: { id: token.id as string },
            relations: ['employments', 'employments.store'],
          })

          if (freshUser) {
            const authUser = buildAuthUser(freshUser as User)
            token.name = authUser.name
            token.role = authUser.role
            token.mustChangePassword = authUser.mustChangePassword
            token.colorTheme = authUser.colorTheme
            token.stores = authUser.stores
          }
        } catch (error) {
          console.error('Error refreshing user data:', error)
        }
      }

      return token
    },
    async session({ session, token }) {
      // Add user info from token to session
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.role = token.role as string
        session.user.mustChangePassword = token.mustChangePassword as boolean
        session.user.colorTheme = token.colorTheme as string
        session.user.stores = token.stores as Array<{
          storeId: string
          name: string
          slug: string
          employmentRole: string
          isOwner: boolean
          subscriptionPlan: string
        }>
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
}
