import { notFound } from 'next/navigation'
import { getStoreContext } from '@/lib/auth/store-context'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

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
    <div className="flex h-screen overflow-hidden">
      <Sidebar storeSlug={context.slug} isOwner={context.isOwner} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          userName={context.userName}
          userEmail={context.userEmail}
          storeSlug={context.slug}
          isOwner={context.isOwner}
        />

        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  )
}
