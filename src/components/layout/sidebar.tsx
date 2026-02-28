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
  Sparkles,
  ChevronDown,
  FileText,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { NavItem, NavGroup, Plan } from '@/types'

interface SidebarProps {
  storeSlug: string
  isOwner: boolean
  role?: string
  plan?: Plan | null
  checkoutUrl?: string | null
}

export function Sidebar({ storeSlug, isOwner, role, plan, checkoutUrl }: SidebarProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setMounted(true)
    // Load expanded groups from localStorage
    const saved = localStorage.getItem(`sidebar-groups-${storeSlug}`)
    if (saved) {
      try {
        setExpandedGroups(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse sidebar groups:', e)
      }
    } else {
      // Default: expand Products and Services groups
      setExpandedGroups({ 'Productos': true, 'Servicios': true })
    }
  }, [storeSlug])

  const toggleGroup = (groupLabel: string) => {
    const newState = {
      ...expandedGroups,
      [groupLabel]: !expandedGroups[groupLabel],
    }
    setExpandedGroups(newState)
    localStorage.setItem(`sidebar-groups-${storeSlug}`, JSON.stringify(newState))
  }

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
    href: `/dashboard/${storeSlug}/products`,
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
    href: `/dashboard/${storeSlug}/services`,
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
      {
        label: 'Presupuestos',
        href: `/dashboard/${storeSlug}/quotes`,
        icon: FileText,
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

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-visible scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {/* Regular items (top) */}
          {regularItems.map((item, index) => (
            <SidebarItem
              key={item.href}
              item={item}
              storeSlug={storeSlug}
              isOwner={isOwner}
              pathname={pathname}
              index={index}
              plan={plan}
            />
          ))}

          {/* Products Group */}
          <SidebarGroup
            key="productos-group"
            group={productGroup}
            storeSlug={storeSlug}
            isOwner={isOwner}
            pathname={pathname}
            plan={plan}
            isExpanded={expandedGroups['Productos'] ?? true}
            onToggle={() => toggleGroup('Productos')}
            startIndex={regularItems.length}
          />

          {/* Services Group */}
          <SidebarGroup
            key="servicios-group"
            group={serviceGroup}
            storeSlug={storeSlug}
            isOwner={isOwner}
            pathname={pathname}
            plan={plan}
            isExpanded={expandedGroups['Servicios'] ?? true}
            onToggle={() => toggleGroup('Servicios')}
            startIndex={regularItems.length + productGroup.children.length + 1}
          />

          {/* More Items (bottom) */}
          {moreItems.map((item, index) => (
            <SidebarItem
              key={item.href}
              item={item}
              storeSlug={storeSlug}
              isOwner={isOwner}
              pathname={pathname}
              index={index + regularItems.length + productGroup.children.length + serviceGroup.children.length + 2}
              plan={plan}
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
  plan,
}: {
  item: NavItem
  storeSlug: string
  isOwner: boolean
  pathname: string
  index: number
  plan?: 'FREE' | 'BASICO' | 'PRO' | null
}) {
  const hasPermission = usePermission(item.permission as any)

  if (item.ownerOnly && !isOwner) return null
  if (item.permission && !hasPermission) return null

  const isActive = pathname === item.href
  const Icon = item.icon

  // Determine if item should be disabled based on plan
  let isDisabled = false
  let disabledReason = ''

  const planRequirements: Record<string, string> = {
    'Productos': 'BÁSICO',
    'Categorías': 'BÁSICO',
    'Inventario': 'BÁSICO',
    'Empleados': 'BÁSICO',
    'Turnos': 'BÁSICO',
    'Proveedores': 'PRO',
    'Órdenes de Compra': 'PRO',
    'Analíticas': 'PRO',
    'Reportes': 'PRO',
    'Ventas': 'BÁSICO',
    'Servicios': 'BÁSICO',
    'Citas': 'BÁSICO',
  }

  const requiredPlan = planRequirements[item.label]
  if (requiredPlan) {
    const planHierarchy = { 'FREE': 0, 'BASICO': 1, 'PRO': 2 }
    const currentLevel = planHierarchy[plan as keyof typeof planHierarchy] || 0
    const requiredLevel = planHierarchy[requiredPlan as keyof typeof planHierarchy] || 0

    if (currentLevel < requiredLevel) {
      isDisabled = true
      disabledReason = `Necesitas plan ${requiredPlan} para usarlo`
    }
  }

  const content = (
    <div className={cn(
      'group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
      isActive
        ? 'text-white shadow-lg shadow-primary/20 bg-primary'
        : isDisabled
          ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
          : 'text-gray-500 hover:text-primary hover:bg-primary/5 dark:text-gray-400 dark:hover:text-primary-foreground dark:hover:bg-primary/20'
    )}>
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
      {!isActive && !isDisabled && (
        <ChevronRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
      )}
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      title={disabledReason}
    >
      {isDisabled ? (
        <div className="cursor-not-allowed">
          {content}
        </div>
      ) : (
        <Link href={item.href}>
          {content}
        </Link>
      )}
    </motion.div>
  )
}

function SidebarGroup({
  group,
  storeSlug,
  isOwner,
  pathname,
  plan,
  isExpanded,
  onToggle,
  startIndex,
}: {
  group: NavGroup
  storeSlug: string
  isOwner: boolean
  pathname: string
  plan?: 'FREE' | 'BASICO' | 'PRO' | null
  isExpanded: boolean
  onToggle: () => void
  startIndex: number
}) {
  const hasGroupPermission = usePermission(group.permission as any)

  if (!hasGroupPermission) return null

  // Check plan requirement for group
  const planRequirements: Record<string, string> = {
    'Servicios': 'BÁSICO',
  }

  const requiredPlan = planRequirements[group.label]
  let isDisabled = false
  let disabledReason = ''

  if (requiredPlan) {
    const planHierarchy = { 'FREE': 0, 'BASICO': 1, 'PRO': 2 }
    const currentLevel = planHierarchy[plan as keyof typeof planHierarchy] || 0
    const requiredLevel = planHierarchy[requiredPlan as keyof typeof planHierarchy] || 0

    if (currentLevel < requiredLevel) {
      isDisabled = true
      disabledReason = `Necesitas plan ${requiredPlan} para usarlo`
    }
  }

  // Check if any child is active to auto-expand
  const hasActiveChild = group.children.some(child => pathname === child.href)
  const shouldAutoExpand = hasActiveChild || isExpanded

  const GroupIcon = group.icon

  const isGroupActive = pathname === group.href || hasActiveChild

  const headerContent = (
    <div className={cn(
      'w-full group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
      isDisabled
        ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
        : isGroupActive
          ? 'text-white'
          : 'text-gray-500 hover:text-primary hover:bg-primary/5 dark:text-gray-400 dark:hover:text-primary-foreground dark:hover:bg-primary/20'
    )}>
      <div className="flex items-center gap-3">
        <GroupIcon className={cn("h-5 w-5 transition-transform duration-300 group-hover:scale-110", isGroupActive ? "scale-110" : "")} />
        <span>{group.label}</span>
      </div>
      <motion.div
        animate={{ rotate: shouldAutoExpand ? 180 : 0 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onToggle()
        }}
        className="cursor-pointer"
      >
        <ChevronDown className="h-4 w-4" />
      </motion.div>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: startIndex * 0.03 }}
      className="space-y-1"
      title={disabledReason}
    >
      {/* Group Header */}
      {isDisabled ? (
        <div className="cursor-not-allowed">
          {headerContent}
        </div>
      ) : group.href ? (
        <Link href={group.href}>
          {headerContent}
        </Link>
      ) : (
        <motion.button
          onClick={onToggle}
          disabled={isDisabled}
          className={cn(
            'w-full group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
            isDisabled
              ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'text-gray-500 hover:text-primary hover:bg-primary/5 dark:text-gray-400 dark:hover:text-primary-foreground dark:hover:bg-primary/20'
          )}
        >
          {headerContent}
        </motion.button>
      )}

      {/* Group Children */}
      <AnimatePresence>
        {shouldAutoExpand && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-1 pl-2"
          >
            {group.children.map((child, index) => (
              <SidebarItem
                key={child.href}
                item={child}
                storeSlug={storeSlug}
                isOwner={isOwner}
                pathname={pathname}
                index={startIndex + index + 1}
                plan={plan}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

