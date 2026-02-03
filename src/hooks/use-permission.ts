'use client'

import { useStore } from './use-store'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'

type Action =
  | 'manage_store' // Only owner
  | 'manage_employees' // Owner, Admin
  | 'manage_products' // Owner, Admin, Manager
  | 'manage_inventory' // Owner, Admin, Manager, Stock Keeper
  | 'make_sales' // Owner, Admin, Manager, Cashier
  | 'view_reports' // Owner, Admin, Manager

const rolePermissions: Record<EmploymentRole, Action[]> = {
  [EmploymentRole.ADMIN]: [
    'manage_employees',
    'manage_products',
    'manage_inventory',
    'make_sales',
    'view_reports',
  ],
  [EmploymentRole.MANAGER]: [
    'manage_products',
    'manage_inventory',
    'make_sales',
    'view_reports',
  ],
  [EmploymentRole.CASHIER]: ['make_sales'],
  [EmploymentRole.STOCK_KEEPER]: ['manage_inventory'],
}

/**
 * Client-side hook to check permissions
 */
export function usePermission(action: Action): boolean {
  const store = useStore()

  if (!store) {
    return false
  }

  // Store owner has all permissions
  if (store.isOwner) {
    return true
  }

  // Check if role has permission for action
  const allowedActions = rolePermissions[store.role as EmploymentRole] || []
  return allowedActions.includes(action)
}
