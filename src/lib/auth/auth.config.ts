import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { signInSchema } from '../validations/auth.schema'
import { getRepository } from '../db'
import { User } from '../db/entities/user.entity'
import { Employment } from '../db/entities/employment.entity'

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          // Validate credentials
          const { email, password } = signInSchema.parse(credentials)

          // Find user
          const userRepo = await getRepository(User)
          const user = await userRepo.findOne({
            where: { email },
            relations: ['employments', 'employments.store'],
          })

          if (!user || !user.isActive) {
            return null
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(password, user.password)
          if (!isValidPassword) {
            return null
          }

          // Check if user has ADMIN or OWNER access (restrict login to these roles)
          const hasAdminAccess = (user.employments || []).some(
            (emp: Employment) => emp.isActive && (emp.role === 'ADMIN' || emp.store.ownerId === user.id)
          )

          if (!hasAdminAccess) {
            console.warn(`Login denied: ${email} has no ADMIN/OWNER role`)
            return null
          }

          // Build stores array from employments
          const stores = (user.employments || [])
            .filter((emp: Employment) => emp.isActive)
            .map((emp: Employment) => ({
              storeId: emp.storeId,
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
    async jwt({ token, user }) {
      // Add user info to token on sign in
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.role = user.role
        token.mustChangePassword = user.mustChangePassword
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
        session.user.stores = token.stores as Array<{
          storeId: string
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
