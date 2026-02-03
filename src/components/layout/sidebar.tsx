'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePermission } from '@/hooks/use-permission'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Warehouse,
  ShoppingCart,
  Receipt,
  Users,
  Settings,
  Store,
  BarChart3,
} from 'lucide-react'

interface SidebarProps {
  storeSlug: string
  isOwner: boolean
}

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission?: 'manage_products' | 'manage_inventory' | 'make_sales' | 'view_reports' | 'manage_employees' | 'manage_store'
}

export function Sidebar({ storeSlug, isOwner }: SidebarProps) {
  const pathname = usePathname()

  const navItems: NavItem[] = [
    {
      label: 'Panel de Control',
      href: `/dashboard/${storeSlug}`,
      icon: LayoutDashboard,
    },
    {
      label: 'Productos',
      href: `/dashboard/${storeSlug}/products`,
      icon: Package,
      permission: 'manage_products',
    },
    {
      label: 'Categorías',
      href: `/dashboard/${storeSlug}/categories`,
      icon: FolderTree,
      permission: 'manage_products',
    },
    {
      label: 'Inventario',
      href: `/dashboard/${storeSlug}/inventory`,
      icon: Warehouse,
      permission: 'manage_inventory',
    },
    {
      label: 'Caja',
      href: `/dashboard/${storeSlug}/pos`,
      icon: ShoppingCart,
      permission: 'make_sales',
    },
    {
      label: 'Ventas',
      href: `/dashboard/${storeSlug}/sales`,
      icon: Receipt,
      permission: 'view_reports',
    },
    {
      label: 'Analíticas',
      href: `/dashboard/${storeSlug}/analytics`,
      icon: BarChart3,
      permission: 'view_reports',
    },
    {
      label: 'Empleados',
      href: `/dashboard/${storeSlug}/employees`,
      icon: Users,
      permission: 'manage_employees',
    },
    {
      label: 'Configuración',
      href: `/dashboard/${storeSlug}/settings`,
      icon: Settings,
      permission: 'manage_store',
    },
  ]

  return (
    <aside className="hidden md:flex w-64 border-r bg-gray-50 dark:bg-gray-900 flex-col h-screen">
      <div className="p-4 border-b">
        <Link href="/dashboard/select-store" className="flex items-center gap-2 hover:opacity-80">
          <Store className="h-5 w-5" />
          <div>
            <h2 className="font-bold text-sm">{storeSlug}</h2>
            <p className="text-xs text-gray-500">
              {isOwner ? 'Propietario' : 'Empleado'}
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const hasPermission = !item.permission || usePermission(item.permission)

          if (!hasPermission) {
            return null
          }

          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t">
        <Link
          href="/dashboard/select-store"
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          Cambiar Tienda
        </Link>
      </div>
    </aside>
  )
}
