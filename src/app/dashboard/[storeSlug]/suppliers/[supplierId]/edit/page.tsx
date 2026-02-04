import { notFound } from 'next/navigation'
import { getStoreContext } from '@/lib/auth/store-context'
import { getDataSource } from '@/lib/db'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { SupplierForm } from '@/components/suppliers/supplier-form'

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ storeSlug: string; supplierId: string }>
}) {
  const { storeSlug, supplierId } = await params
  const context = await getStoreContext(storeSlug)

  if (!context) {
    return null
  }

  const dataSource = await getDataSource()
  const supplierRepo = dataSource.getRepository(Supplier)

  const supplier = await supplierRepo.findOne({
    where: { id: supplierId, storeId: context.storeId },
  })

  if (!supplier) {
    notFound()
  }

  // Convert to plain object for form
  const supplierData = {
    name: supplier.name,
    taxId: supplier.taxId,
    website: supplier.website,
    address: supplier.address,
    city: supplier.city,
    state: supplier.state,
    zipCode: supplier.zipCode,
    country: supplier.country,
    currency: supplier.currency,
    rating: supplier.rating ? Number(supplier.rating) : undefined,
    isPreferred: supplier.isPreferred,
    notes: supplier.notes,
    isActive: supplier.isActive,
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Editar Proveedor</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Actualiza la información del proveedor
        </p>
      </div>

      <SupplierForm mode="edit" supplier={{ ...supplierData, id: supplier.id }} />
    </div>
  )
}
