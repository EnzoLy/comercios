'use client'

import { useState, useEffect } from 'react'
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
  Clock,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

interface SidebarProps {
  storeSlug: string
  isOwner: boolean
  role?: string
}

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission?: 'manage_products' | 'manage_inventory' | 'make_sales' | 'view_reports' | 'manage_employees' | 'manage_store'
  ownerOnly?: boolean
}

export function Sidebar({ storeSlug, isOwner, role }: SidebarProps) {
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
      ownerOnly: false,
    },
    {
      label: 'Turnos',
      href: `/dashboard/${storeSlug}/shifts`,
      icon: Clock,
      permission: 'manage_employees',
      ownerOnly: false,
    },
    {
      label: 'Configuración',
      href: `/dashboard/${storeSlug}/settings`,
      icon: Settings,
      permission: 'manage_store',
      ownerOnly: true,
    },
  ]

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <aside className="hidden md:flex w-64 border-r bg-white dark:bg-gray-950 flex-col h-screen">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            <div>
              <h2 className="font-bold text-sm">{storeSlug}</h2>
              <p className="text-xs text-gray-500">
                {isOwner ? 'Propietario' : 'Empleado'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* Skeleton or empty space to avoid jump */}
          <div className="h-full w-full bg-transparent" />
        </div>
      </aside>
    )
  }

  return (
    <aside className="hidden md:flex w-64 border-r bg-white dark:bg-gray-950 flex-col h-screen">
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
        {navItems.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            storeSlug={storeSlug}
            isOwner={isOwner}
            pathname={pathname}
          />
        ))}
      </nav>

      <div className="p-4 border-t space-y-2">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-gray-600">Tema</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}

function SidebarItem({
  item,
  storeSlug,
  isOwner,
  pathname,
}: {
  item: NavItem
  storeSlug: string
  isOwner: boolean
  pathname: string
}) {
  const hasPermission = usePermission(item.permission as any)

  // Check owner-only restriction
  if (item.ownerOnly && !isOwner) {
    return null
  }

  // Check permissions (some items don't need permission)
  if (item.permission && !hasPermission) {
    return null
  }

  const isActive = pathname === item.href
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'text-white dark:text-white hover:opacity-90'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
      )}
      style={isActive ? { backgroundColor: 'var(--color-primary)' } : {}}
    >
      <Icon className="h-5 w-5" />
      {item.label}
    </Link>
  )
}
