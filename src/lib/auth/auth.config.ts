import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { signInSchema } from '../validations/auth.schema'
import { getRepository } from '../db'
import { User } from '../db/entities/user.entity'
import { Employment } from '../db/entities/employment.entity'

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

          // For QR login, skip password validation
          if (!isQrLogin) {
            // Normal login - validate credentials with schema
            const validated = signInSchema.parse({ email, password })
            const validatedEmail = validated.email
            const validatedPassword = validated.password

            // Find user
            const userRepo = await getRepository(User)
            const user = await userRepo.findOne({
              where: { email: validatedEmail },
              relations: ['employments', 'employments.store'],
            })

            if (!user || !user.isActive) {
              return null
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(validatedPassword, user.password)
            if (!isValidPassword) {
              return null
            }
          } else {
            // QR login - only validate email exists
            if (!email) {
              return null
            }
          }

          // Find user for both normal and QR login
          const userRepo = await getRepository(User)
          const user = await userRepo.findOne({
            where: { email },
            relations: ['employments', 'employments.store'],
          })

          if (!user || !user.isActive) {
            return null
          }

          // For normal login, restrict to ADMIN or OWNER
          // For QR login, allow any active user with valid employment
          if (!isQrLogin) {
            const hasAdminAccess = (user.employments || []).some(
              (emp: Employment) => emp.isActive && (emp.role === 'ADMIN' || emp.store.ownerId === user.id)
            )

            if (!hasAdminAccess) {
              console.warn(`Login denied: ${email} has no ADMIN/OWNER role`)
              return null
            }
          }

          // Build stores array from employments
          const stores = (user.employments || [])
            .filter((emp: Employment) => emp.isActive)
            .map((emp: Employment) => ({
              storeId: emp.storeId,
              name: emp.store.name,
              slug: emp.store.slug,
              employmentRole: emp.role,
              isOwner: emp.store.ownerId === user.id,
            }))

          // Return user with stores
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            mustChangePassword: user.mustChangePassword,
            colorTheme: user.colorTheme,
            stores,
          }
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
    async jwt({ token, user }) {
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
