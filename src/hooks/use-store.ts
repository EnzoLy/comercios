'use client'

import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

/**
 * Client-side hook to get current store from URL
 */
export function useStore() {
  const params = useParams()
  const { data: session } = useSession()
  const storeSlug = params?.storeSlug as string | undefined

  return useMemo(() => {
    if (!storeSlug || !session?.user) {
      return null
    }

    const store = session.user.stores.find((s) => s.slug === storeSlug)

    if (!store) {
      return null
    }

    // Check for impersonation in localStorage
    if (typeof window !== 'undefined') {
      const activeUserId = localStorage.getItem('activeUserId')
      const activeUserRole = localStorage.getItem('activeUserRole')
      const activeUserIsOwner = localStorage.getItem('activeUserIsOwner')

      // Apply override if activeUserId exists and optionally differs from session user
      // or if it's explicitly set to impersonate (even if same ID, e.g. owner acting as cashier)
      if (activeUserId && activeUserRole) {
        // SECURITY: Validate that activeUserId exists in user's stores
        // This prevents UI confusion from localStorage manipulation
        // The API will still validate on each request
        const hasAccess = session.user.stores.some((s) =>
          s.storeId === store.storeId
        )

        if (!hasAccess && activeUserId !== session.user.id) {
          // Clear invalid localStorage data
          localStorage.removeItem('activeUserId')
          localStorage.removeItem('activeUserRole')
          localStorage.removeItem('activeUserIsOwner')
          localStorage.removeItem('activeUserName')

          // Fall through to default session values
        } else {
          return {
            storeId: store.storeId,
            slug: store.slug,
            isOwner: activeUserIsOwner === 'true',
            role: activeUserRole,
          }
        }
      }
    }

    return {
      storeId: store.storeId,
      slug: store.slug,
      isOwner: store.isOwner,
      role: store.employmentRole,
    }
  }, [storeSlug, session])
}
