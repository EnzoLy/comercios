import { DefaultSession } from 'next-auth'
import { JWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      colorTheme: string
      stores: Array<{
        storeId: string
        name: string
        slug: string
        employmentRole: string
        isOwner: boolean
      }>
      mustChangePassword: boolean
    } & DefaultSession['user']
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    colorTheme: string
    stores: Array<{
      storeId: string
      name: string
      slug: string
      employmentRole: string
      isOwner: boolean
    }>
    mustChangePassword: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    email: string
    name: string
    role: string
    colorTheme: string
    stores: Array<{
      storeId: string
      name: string
      slug: string
      employmentRole: string
      isOwner: boolean
    }>
    mustChangePassword: boolean
  }
}
