import { getStoreContext } from '@/lib/auth/store-context'
import { SupplierForm } from '@/components/suppliers/supplier-form'

export default async function NewSupplierPage({
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
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Nuevo Proveedor</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Agrega un nuevo proveedor a tu tienda
        </p>
      </div>

      <SupplierForm mode="create" />
    </div>
  )
}
