'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePermission } from '@/hooks/use-permission'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
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
  QrCode,
  Truck,
  ClipboardList,
  ChevronRight,
  BookOpen,
  Zap,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'


interface SidebarProps {
  storeSlug: string
  isOwner: boolean
  role?: string
  plan?: 'FREE' | 'BASICO' | 'PRO' | null
  checkoutUrl?: string | null
}

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission?: 'manage_products' | 'manage_inventory' | 'make_sales' | 'view_reports' | 'manage_employees' | 'manage_store'
  ownerOnly?: boolean
}

export function Sidebar({ storeSlug, isOwner, role, plan, checkoutUrl }: SidebarProps) {
  const pathname = usePathname()

  const navItems: NavItem[] = [
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
      <aside className="hidden md:flex w-64 border-r bg-white/50 backdrop-blur-xl flex-col h-screen">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-0.5 rounded-xl bg-primary/10 overflow-hidden">
              <Image src="/logo-processed.png" alt="Logo" width={28} height={28} className="object-cover rounded-lg" />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-tight">{storeSlug}</h2>
              <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">
                {isOwner ? 'Propietario' : 'Empleado'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="h-full w-full bg-transparent" />
        </div>
      </aside>
    )
  }

  return (
    <aside className="hidden md:flex w-64 border-r bg-card flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-gray-100 dark:border-gray-800">
        <Link href="/dashboard/select-store" className="group flex items-center gap-3 hover:opacity-100 transition-all">
          <div className="p-0.5 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors overflow-hidden">
            <Image src="/logo-processed.png" alt="Logo" width={28} height={28} className="object-cover rounded-lg" />
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-tight group-hover:text-primary transition-colors">{storeSlug}</h2>
            <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">
              {isOwner ? 'Propietario' : 'Empleado'}
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {navItems.map((item, index) => (
            <SidebarItem
              key={item.href}
              item={item}
              storeSlug={storeSlug}
              isOwner={isOwner}
              pathname={pathname}
              index={index}
            />
          ))}
        </AnimatePresence>
      </nav>

      <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-2 bg-background/20">
        {isOwner && plan && plan !== 'PRO' && (
          <a
            href={checkoutUrl || '/pricing'}
            target={checkoutUrl ? '_blank' : '_self'}
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 transition-all shadow-md shadow-blue-500/20"
          >
            <Zap className="h-4 w-4 shrink-0" />
            {plan === 'FREE' ? 'Mejorar Plan' : 'Mejorar a Pro'}
          </a>
        )}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-secondary/50 backdrop-blur-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Modo</span>
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
  index,
}: {
  item: NavItem
  storeSlug: string
  isOwner: boolean
  pathname: string
  index: number
}) {
  const hasPermission = usePermission(item.permission as any)

  if (item.ownerOnly && !isOwner) return null
  if (item.permission && !hasPermission) return null

  const isActive = pathname === item.href
  const Icon = item.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link
        href={item.href}
        className={cn(
          'group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
          isActive
            ? 'text-white shadow-lg shadow-primary/20 bg-primary'
            : 'text-gray-500 hover:text-primary hover:bg-primary/5 dark:text-gray-400 dark:hover:text-primary-foreground dark:hover:bg-primary/20'
        )}
      >
        <div className="flex items-center gap-3">
          <Icon className={cn("h-5 w-5 transition-transform duration-300 group-hover:scale-110", isActive ? "scale-110" : "")} />
          <span>{item.label}</span>
        </div>
        {isActive && (
          <motion.div
            layoutId="active-indicator"
            className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
          />
        )}
        {!isActive && (
          <ChevronRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
        )}
      </Link>
    </motion.div>
  )
}

