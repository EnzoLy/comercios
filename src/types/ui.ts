/**
 * UI component types for navigation and layout
 */

/**
 * Navigation item for sidebar and menu rendering
 */
export interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission?: 'manage_products' | 'manage_inventory' | 'make_sales' | 'view_reports' | 'manage_employees' | 'manage_store'
  ownerOnly?: boolean
}

/**
 * Navigation group for organizing related nav items
 */
export interface NavGroup {
  label: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  children: NavItem[]
  permission?: 'manage_products'
}
