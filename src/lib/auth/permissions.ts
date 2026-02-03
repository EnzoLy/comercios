import { auth } from './auth'
import { EmploymentRole } from '../db/entities/employment.entity'

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth() {
  const session = await auth()
  if (!session?.user) {
    throw new UnauthorizedError('Authentication required')
  }
  return session
}

/**
 * Verify user has access to a store
 */
export async function requireStoreAccess(storeId: string) {
  const session = await requireAuth()
  const hasAccess = session.user.stores.some((s) => s.storeId === storeId)

  if (!hasAccess) {
    throw new ForbiddenError('Access denied to this store')
  }

  return session
}

/**
 * Verify user has specific role(s) in a store
 */
export async function requireRole(
  storeId: string,
  allowedRoles: EmploymentRole[]
) {
  const session = await requireStoreAccess(storeId)
  const store = session.user.stores.find((s) => s.storeId === storeId)

  if (!store) {
    throw new ForbiddenError('Store not found')
  }

  // Store owner always has access
  if (store.isOwner) {
    return session
  }

  // Check employment role
  if (!allowedRoles.includes(store.employmentRole as EmploymentRole)) {
    throw new ForbiddenError('Insufficient permissions')
  }

  return session
}

/**
 * Check if user is store owner
 */
export async function isStoreOwner(storeId: string): Promise<boolean> {
  const session = await requireAuth()
  const store = session.user.stores.find((s) => s.storeId === storeId)
  return store?.isOwner || false
}

/**
 * Get store ID from request headers (set by middleware)
 */
export function getStoreIdFromHeaders(request: Request): string | null {
  return request.headers.get('x-store-id')
}

/**
 * Get user ID from request headers (set by middleware)
 */
export function getUserIdFromHeaders(request: Request): string | null {
  return request.headers.get('x-user-id')
}

/**
 * Get employment role from request headers (set by middleware)
 */
export function getEmploymentRoleFromHeaders(request: Request): EmploymentRole | null {
  const role = request.headers.get('x-employment-role')
  return role as EmploymentRole | null
}
