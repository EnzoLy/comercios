import { notFound } from 'next/navigation'
import { getStoreContext } from '@/lib/auth/store-context'
import { StoreLayoutClient } from '@/components/layout/store-layout-client'

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ storeSlug: string }>
}) {
  const { storeSlug } = await params
  const context = await getStoreContext(storeSlug)

  if (!context) {
    notFound()
  }

  return (
    <StoreLayoutClient
      storeSlug={context.slug}
      initialUserName={context.userName}
      initialUserEmail={context.userEmail}
      initialIsOwner={context.isOwner}
    >
      {children}
    </StoreLayoutClient>
  )
}
