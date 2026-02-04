import { getStoreContext } from '@/lib/auth/store-context'
import { PriceAlertsList } from '@/components/suppliers/price-alerts-list'

export default async function PriceAlertsPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>
}) {
  const { storeSlug } = await params
  const context = await getStoreContext(storeSlug)

  if (!context) {
    return null
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Alertas de Precios</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Revisa los cambios significativos en precios de proveedores
        </p>
      </div>

      <PriceAlertsList storeId={context.storeId} storeSlug={storeSlug} />
    </div>
  )
}
