import { getStoreContext } from '@/lib/auth/store-context'
import { getDataSource } from '@/lib/db'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { Category } from '@/lib/db/entities/category.entity'
import { PriceComparison } from '@/components/suppliers/price-comparison'

export default async function PriceComparisonPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>
}) {
  const { storeSlug } = await params
  const context = await getStoreContext(storeSlug)

  if (!context) {
    return null
  }

  const dataSource = await getDataSource()

  // Fetch all active suppliers for this store
  const suppliers = await dataSource
    .getRepository(Supplier)
    .find({
      where: { storeId: context.storeId, isActive: true },
      order: { name: 'ASC' },
    })

  // Fetch all categories for filtering
  const categories = await dataSource
    .getRepository(Category)
    .find({
      where: { storeId: context.storeId, isActive: true },
      order: { name: 'ASC' },
    })

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Comparación de Precios</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Compara precios de productos entre diferentes proveedores
        </p>
      </div>

      <PriceComparison
        storeId={context.storeId}
        storeSlug={storeSlug}
        suppliers={suppliers}
        categories={categories}
      />
    </div>
  )
}
