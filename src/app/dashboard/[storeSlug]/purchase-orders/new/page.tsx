import Link from 'next/link'
import { getStoreContext } from '@/lib/auth/store-context'
import { getDataSource } from '@/lib/db'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { PurchaseOrderForm } from '@/components/purchase-orders/purchase-order-form'

export default async function NewPurchaseOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>
  searchParams: Promise<{ supplierId?: string }>
}) {
  const { storeSlug } = await params
  const { supplierId } = await searchParams
  const context = await getStoreContext(storeSlug)

  if (!context) {
    return null
  }

  const dataSource = await getDataSource()
  const supplierRepo = dataSource.getRepository(Supplier)
  const productRepo = dataSource.getRepository(Product)

  // Fetch active suppliers
  const suppliers = await supplierRepo.find({
    where: { storeId: context.storeId, isActive: true },
    order: { name: 'ASC' },
  })

  // Fetch active products
  const products = await productRepo.find({
    where: { storeId: context.storeId, isActive: true },
    order: { name: 'ASC' },
  })

  // Serialize to plain objects for Client Component
  const serializedSuppliers = JSON.parse(JSON.stringify(suppliers))
  const serializedProducts = JSON.parse(JSON.stringify(products))

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href={`/dashboard/${storeSlug}/purchase-orders`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Órdenes de Compra
          </Link>
        </Button>

        <h1 className="text-2xl md:text-3xl font-bold mb-2">Nueva Orden de Compra</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Crea una nueva orden de compra para un proveedor
        </p>
      </div>

      <PurchaseOrderForm
        mode="create"
        suppliers={serializedSuppliers}
        products={serializedProducts}
        defaultSupplierId={supplierId}
      />
    </div>
  )
}
