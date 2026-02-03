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

    return {
      storeId: store.storeId,
      slug: store.slug,
      isOwner: store.isOwner,
      role: store.employmentRole,
    }
  }, [storeSlug, session])
}
