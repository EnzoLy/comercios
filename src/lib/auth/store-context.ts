import { requireAuth } from './permissions'

/**
 * Get current store context from session
 * Used in server components to access store information
 */
export async function getStoreContext(storeSlug: string) {
  const session = await requireAuth()
  const store = session.user.stores.find((s) => s.slug === storeSlug)

  if (!store) {
    return null
  }

  return {
    storeId: store.storeId,
    slug: store.slug,
    isOwner: store.isOwner,
    role: store.employmentRole,
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
  }
}

/**
 * Get all stores user has access to
 */
export async function getUserStores() {
  const session = await requireAuth()
  return session.user.stores
}
