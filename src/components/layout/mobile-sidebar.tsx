'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePermission } from '@/hooks/use-permission'
import Image from 'next/image'
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
  QrCode,
  Truck,
  ClipboardList,
  BookOpen,
  Sun,
  Moon,
  Sparkles,
  ChevronDown,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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

interface NavGroup {
  label: string
  icon: React.ComponentType<{ className?: string }>
  children: NavItem[]
  permission?: 'manage_products'
}

export function MobileSidebar({ storeSlug, isOwner, role }: MobileSidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const regularItems: NavItem[] = [
    {
      label: 'Panel de Control',
      href: `/dashboard/${storeSlug}`,
      icon: LayoutDashboard,
    },
    {
      label: 'Mi Acceso',
      href: `/dashboard/${storeSlug}/my-access`,
      icon: QrCode,
    },
    {
      label: 'Tutoriales',
      href: `/dashboard/${storeSlug}/tutoriales`,
      icon: BookOpen,
    },
  ]

  const productGroup: NavGroup = {
    label: 'Productos',
    icon: Package,
    permission: 'manage_products',
    children: [
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
        label: 'Proveedores',
        href: `/dashboard/${storeSlug}/suppliers`,
        icon: Truck,
        permission: 'manage_products',
      },
      {
        label: 'Órdenes de Compra',
        href: `/dashboard/${storeSlug}/purchase-orders`,
        icon: ClipboardList,
        permission: 'manage_products',
      },
    ],
  }

  const serviceGroup: NavGroup = {
    label: 'Servicios',
    icon: Sparkles,
    children: [
      {
        label: 'Servicios',
        href: `/dashboard/${storeSlug}/services`,
        icon: Sparkles,
        permission: 'manage_products',
      },
      {
        label: 'Citas',
        href: `/dashboard/${storeSlug}/appointments`,
        icon: Clock,
        permission: 'manage_products',
      },
    ],
  }

  const moreItems: NavItem[] = [
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
      ownerOnly: true,
    },
  ]

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupLabel]: !prev[groupLabel],
    }))
  }

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check current theme
    const theme = localStorage.getItem('theme')
    const isDarkMode = theme === 'dark' ||
      (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setIsDark(isDarkMode)
  }, [])

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark'
    localStorage.setItem('theme', newTheme)

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    setIsDark(!isDark)
  }

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
        <SheetHeader className="sr-only">
          <SheetTitle>Menú de Navegación</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <Link
              href="/dashboard/select-store"
              className="flex items-center gap-2 hover:opacity-80"
              onClick={() => setOpen(false)}
            >
              <Image src="/logo-processed.png" alt="Logo" width={24} height={24} className="rounded-md object-cover" />
              <div>
                <h2 className="font-bold text-sm">{storeSlug}</h2>
                <p className="text-xs text-gray-500">
                  {isOwner ? 'Propietario' : 'Empleado'}
                </p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {/* Regular items */}
            {regularItems.map((item) => (
              <SidebarItem
                key={item.href}
                item={item}
                storeSlug={storeSlug}
                isOwner={isOwner}
                pathname={pathname}
                onClose={() => setOpen(false)}
              />
            ))}

            {/* Products Group */}
            <MobileSidebarGroup
              group={productGroup}
              storeSlug={storeSlug}
              isOwner={isOwner}
              pathname={pathname}
              isExpanded={expandedGroups['Productos'] ?? false}
              onToggle={() => toggleGroup('Productos')}
              onClose={() => setOpen(false)}
            />

            {/* Services Group */}
            <MobileSidebarGroup
              group={serviceGroup}
              storeSlug={storeSlug}
              isOwner={isOwner}
              pathname={pathname}
              isExpanded={expandedGroups['Servicios'] ?? false}
              onToggle={() => toggleGroup('Servicios')}
              onClose={() => setOpen(false)}
            />

            {/* More Items */}
            {moreItems.map((item) => (
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

          <div className="p-4 border-t">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {isDark ? (
                <>
                  <Sun className="h-5 w-5" />
                  <span>Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="h-5 w-5" />
                  <span>Modo Oscuro</span>
                </>
              )}
            </button>
          </div>

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

function MobileSidebarGroup({
  group,
  storeSlug,
  isOwner,
  pathname,
  isExpanded,
  onToggle,
  onClose,
}: {
  group: NavGroup
  storeSlug: string
  isOwner: boolean
  pathname: string
  isExpanded: boolean
  onToggle: () => void
  onClose: () => void
}) {
  const hasGroupPermission = usePermission(group.permission as any)

  if (!hasGroupPermission) return null

  const hasActiveChild = group.children.some(child => pathname === child.href)
  const shouldExpand = hasActiveChild || isExpanded
  const GroupIcon = group.icon

  return (
    <div className="space-y-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <div className="flex items-center gap-3">
          <GroupIcon className="h-5 w-5" />
          <span>{group.label}</span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform',
            shouldExpand ? 'rotate-180' : ''
          )}
        />
      </button>

      {shouldExpand && (
        <div className="space-y-1 pl-4">
          {group.children.map((child) => (
            <SidebarItem
              key={child.href}
              item={child}
              storeSlug={storeSlug}
              isOwner={isOwner}
              pathname={pathname}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  )
}
