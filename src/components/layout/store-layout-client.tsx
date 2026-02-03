'use client'

import { Sidebar } from './sidebar'
import { Header } from './header'
import { ActiveEmployeeProvider, useActiveEmployee } from '@/contexts/active-employee-context'
import { useSession } from 'next-auth/react'

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

  // Use active employee if impersonating, otherwise use session/initial props
  const displayName = activeEmployee?.name || initialUserName
  const displayEmail = session?.user?.email || initialUserEmail
  const displayIsOwner = activeEmployee?.isOwner ?? initialIsOwner
  const displayRole = activeEmployee?.role

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
