'use client'

import { Sidebar } from './sidebar'
import { Header } from './header'
import { ActiveEmployeeProvider, useActiveEmployee } from '@/contexts/active-employee-context'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface StoreLayoutClientProps {
  children: React.ReactNode
  storeSlug: string
  initialUserName: string
  initialUserEmail: string
  initialIsOwner: boolean
}

function StoreLayoutContent({
  children,
  storeSlug,
  initialUserName,
  initialUserEmail,
  initialIsOwner,
}: StoreLayoutClientProps) {
  const { activeEmployee, isImpersonating } = useActiveEmployee()
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  // Use active employee if impersonating, otherwise use session/initial props
  const displayName = activeEmployee?.name || initialUserName
  const displayEmail = session?.user?.email || initialUserEmail
  const displayIsOwner = activeEmployee?.isOwner ?? initialIsOwner
  const displayRole = activeEmployee?.role

  // Check route access based on activeEmployee role
  // Extract page from pathname: /dashboard/[storeSlug]/[page]
  const pageMatch = pathname.match(`^/dashboard/${storeSlug}/([^/]+)`)
  const page = pageMatch ? pageMatch[1] : ''

  // Define allowed routes by role
  const allowedRoutes: Record<string, string[]> = {
    CASHIER: ['pos'],
    STOCK_KEEPER: ['pos', 'inventory'],
    MANAGER: ['pos', 'employees', 'shifts', 'analytics', 'sales', 'reports'],
    ADMIN: [
      'pos',
      'employees',
      'shifts',
      'analytics',
      'sales',
      'reports',
      'products',
      'categories',
      'inventory',
    ],
  }

  const role = displayRole || ''
  const allowedPagesForRole = allowedRoutes[role] || ['pos']

  // If activeEmployee exists, is NOT owner, and trying to access unauthorized page
  const isUnauthorized =
    activeEmployee &&
    !displayIsOwner &&
    page &&
    !allowedPagesForRole.includes(page)

  // Redirect immediately if unauthorized
  useEffect(() => {
    if (isUnauthorized) {
      router.push(`/dashboard/${storeSlug}`)
    }
  }, [isUnauthorized, storeSlug, router])

  // Don't render page content if unauthorized
  if (isUnauthorized) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar storeSlug={storeSlug} isOwner={displayIsOwner} role={displayRole} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          userName={displayName}
          storeSlug={storeSlug}
          isOwner={displayIsOwner}
          isImpersonating={isImpersonating}
          role={displayRole}
        />

        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  )
}

export function StoreLayoutClient(props: StoreLayoutClientProps) {
  return (
    <ActiveEmployeeProvider>
      <StoreLayoutContent {...props} />
    </ActiveEmployeeProvider>
  )
}
