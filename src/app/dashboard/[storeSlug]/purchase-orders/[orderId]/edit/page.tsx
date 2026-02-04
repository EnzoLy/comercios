import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getStoreContext } from '@/lib/auth/store-context'
import { getDataSource } from '@/lib/db'
import { PurchaseOrder, PurchaseOrderStatus } from '@/lib/db/entities/purchase-order.entity'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { PurchaseOrderForm } from '@/components/purchase-orders/purchase-order-form'

export default async function EditPurchaseOrderPage({
  params,
}: {
  params: Promise<{ storeSlug: string; orderId: string }>
}) {
  const { storeSlug, orderId } = await params
  const context = await getStoreContext(storeSlug)

  if (!context) {
    return null
  }

  const dataSource = await getDataSource()
  const poRepo = dataSource.getRepository(PurchaseOrder)
  const supplierRepo = dataSource.getRepository(Supplier)
  const productRepo = dataSource.getRepository(Product)

  // Fetch purchase order
  const purchaseOrder = await poRepo.findOne({
    where: { id: orderId, storeId: context.storeId },
    relations: ['supplier', 'items', 'items.product'],
  })

  if (!purchaseOrder) {
    notFound()
  }

  // Don't allow editing if status is RECEIVED or CANCELLED
  if (
    purchaseOrder.status === PurchaseOrderStatus.RECEIVED ||
    purchaseOrder.status === PurchaseOrderStatus.CANCELLED
  ) {
    return (
      <div className="p-4 md:p-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href={`/dashboard/${storeSlug}/purchase-orders/${orderId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a la Orden
            </Link>
          </Button>

          <h1 className="text-2xl md:text-3xl font-bold mb-2">No se puede editar</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Esta orden de compra no puede ser editada porque está {' '}
            {purchaseOrder.status === PurchaseOrderStatus.RECEIVED ? 'recibida' : 'cancelada'}.
          </p>
        </div>
      </div>
    )
  }

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
  const serializedPO = JSON.parse(JSON.stringify(purchaseOrder))

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href={`/dashboard/${storeSlug}/purchase-orders/${orderId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a la Orden
          </Link>
        </Button>

        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Editar Orden de Compra: {purchaseOrder.orderNumber}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Modifica los detalles de la orden de compra
        </p>
      </div>

      <PurchaseOrderForm
        mode="edit"
        suppliers={serializedSuppliers}
        products={serializedProducts}
        purchaseOrder={serializedPO}
      />
    </div>
  )
}
