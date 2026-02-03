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
  BarChart3,
  Users,
  Settings,
  Store,
  Menu,
  Clock,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

interface MobileSidebarProps {
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

export function MobileSidebar({ storeSlug, isOwner, role }: MobileSidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

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
      label: 'Turnos',
      href: `/dashboard/${storeSlug}/shifts`,
      icon: Clock,
      permission: 'manage_employees',
    },
    {
      label: 'Configuración',
      href: `/dashboard/${storeSlug}/settings`,
      icon: Settings,
      permission: 'manage_store',
    },
  ]

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="md:hidden">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Alternar menú</span>
      </Button>
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Alternar menú</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <Link
              href="/dashboard/select-store"
              className="flex items-center gap-2 hover:opacity-80"
              onClick={() => setOpen(false)}
            >
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
                onClose={() => setOpen(false)}
              />
            ))}
          </nav>

        </div>
      </SheetContent>
    </Sheet>
  )
}

function SidebarItem({
  item,
  storeSlug,
  isOwner,
  pathname,
  onClose,
}: {
  item: NavItem
  storeSlug: string
  isOwner: boolean
  pathname: string
  onClose: () => void
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
      onClick={onClose}
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
}
