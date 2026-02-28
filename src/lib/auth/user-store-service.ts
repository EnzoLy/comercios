/**
 * User store service
 * Handles building store access data from user employments
 */
import { User } from '../db/entities/user.entity'
import { Employment } from '../db/entities/employment.entity'

export interface StoreAccess {
  storeId: string
  name: string
  slug: string
  employmentRole: string
  isOwner: boolean
  subscriptionPlan: string
}

export function buildUserStores(user: User): StoreAccess[] {
  return (user.employments || [])
    .filter((emp: any) => emp.isActive)
    .map((emp: any) => ({
      storeId: emp.storeId,
      name: emp.store.name,
      slug: emp.store.slug,
      employmentRole: emp.role,
      isOwner: emp.store.ownerId === user.id,
      subscriptionPlan: emp.store.subscriptionPlan || 'FREE',
    }))
}

export function validateAdminAccess(user: User): boolean {
  return (user.employments || []).some(
    (emp: any) => emp.isActive && (emp.role === 'ADMIN' || emp.store.ownerId === user.id)
  )
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  mustChangePassword: boolean
  colorTheme: string
  stores: StoreAccess[]
}

export function buildAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    colorTheme: user.colorTheme,
    stores: buildUserStores(user),
  }
}
