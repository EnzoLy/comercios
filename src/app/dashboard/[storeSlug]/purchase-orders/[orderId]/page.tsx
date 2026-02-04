import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getStoreContext } from '@/lib/auth/store-context'
import { getDataSource } from '@/lib/db'
import { PurchaseOrder, PurchaseOrderStatus } from '@/lib/db/entities/purchase-order.entity'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Package, Calendar, Truck, FileText } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { ReceiveMerchandiseDialog } from '@/components/purchase-orders/receive-merchandise-dialog'
import { CancelOrderButton } from '@/components/purchase-orders/cancel-order-button'

export default async function PurchaseOrderDetailPage({
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

  // Fetch purchase order with all relations
  const purchaseOrder = await poRepo.findOne({
    where: { id: orderId, storeId: context.storeId },
    relations: ['supplier', 'items', 'items.product'],
  })

  if (!purchaseOrder) {
    notFound()
  }

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    const variants: Record<
      PurchaseOrderStatus,
      { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }
    > = {
      [PurchaseOrderStatus.DRAFT]: { variant: 'secondary', label: 'Borrador' },
      [PurchaseOrderStatus.SENT]: { variant: 'outline', label: 'Enviado' },
      [PurchaseOrderStatus.CONFIRMED]: { variant: 'default', label: 'Confirmado' },
      [PurchaseOrderStatus.PARTIALLY_RECEIVED]: {
        variant: 'outline',
        label: 'Parcialmente Recibido',
      },
      [PurchaseOrderStatus.RECEIVED]: { variant: 'default', label: 'Recibido' },
      [PurchaseOrderStatus.CANCELLED]: { variant: 'destructive', label: 'Cancelado' },
    }

    const config = variants[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date))
  }

  const canEdit =
    purchaseOrder.status === PurchaseOrderStatus.DRAFT ||
    purchaseOrder.status === PurchaseOrderStatus.SENT

  const canReceive =
    purchaseOrder.status === PurchaseOrderStatus.SENT ||
    purchaseOrder.status === PurchaseOrderStatus.CONFIRMED ||
    purchaseOrder.status === PurchaseOrderStatus.PARTIALLY_RECEIVED

  const canCancel =
    purchaseOrder.status === PurchaseOrderStatus.DRAFT ||
    purchaseOrder.status === PurchaseOrderStatus.SENT

  const isViewOnly = purchaseOrder.status === PurchaseOrderStatus.RECEIVED

  // Serialize for Client Component
  const serializedPO = JSON.parse(JSON.stringify(purchaseOrder))

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href={`/dashboard/${storeSlug}/purchase-orders`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Órdenes de Compra
          </Link>
        </Button>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-2xl md:text-3xl font-bold">{purchaseOrder.orderNumber}</h1>
              {getStatusBadge(purchaseOrder.status)}
            </div>

            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>
                  Proveedor:{' '}
                  <Link
                    href={`/dashboard/${storeSlug}/suppliers/${purchaseOrder.supplier.id}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {purchaseOrder.supplier.name}
                  </Link>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Fecha de Orden: {formatDate(purchaseOrder.orderDate)}</span>
              </div>
              {purchaseOrder.expectedDeliveryDate && (
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  <span>
                    Entrega Esperada: {formatDate(purchaseOrder.expectedDeliveryDate)}
                  </span>
                </div>
              )}
              {purchaseOrder.actualDeliveryDate && (
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  <span>
                    Entrega Real: {formatDate(purchaseOrder.actualDeliveryDate)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {canReceive && (
              <ReceiveMerchandiseDialog
                purchaseOrder={serializedPO}
                storeSlug={storeSlug}
              />
            )}
            {canEdit && (
              <Button variant="outline" asChild>
                <Link href={`/dashboard/${storeSlug}/purchase-orders/${orderId}/edit`}>
                  Editar
                </Link>
              </Button>
            )}
            {canCancel && (
              <CancelOrderButton
                orderId={orderId}
                storeSlug={storeSlug}
              />
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <Card style={{ borderColor: 'var(--color-primary)' }} className="mb-6">
        <CardHeader>
          <CardTitle>Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 sm:px-4">Producto</th>
                  <th className="text-center py-3 px-2 sm:px-4">Cantidad Ordenada</th>
                  <th className="text-center py-3 px-2 sm:px-4">Cantidad Recibida</th>
                  <th className="text-right py-3 px-2 sm:px-4">Precio Unit.</th>
                  {purchaseOrder.items?.some((item) => item.discountPercentage > 0) && (
                    <th className="text-center py-3 px-2 sm:px-4">Desc. %</th>
                  )}
                  <th className="text-right py-3 px-2 sm:px-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrder.items?.map((item) => {
                  const itemTotal =
                    item.quantityOrdered * Number(item.unitPrice) *
                    (1 - Number(item.discountPercentage) / 100)

                  return (
                    <tr key={item.id} className="border-b">
                      <td className="py-3 px-2 sm:px-4">
                        <div>
                          <p className="font-medium">{item.product?.name}</p>
                          <p className="text-xs text-gray-500">{item.product?.sku}</p>
                          {item.notes && (
                            <p className="text-xs text-gray-500 mt-1">
                              <FileText className="h-3 w-3 inline mr-1" />
                              {item.notes}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-center">
                        {item.quantityOrdered}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-center">
                        <span
                          className={
                            item.quantityReceived === item.quantityOrdered
                              ? 'text-green-600'
                              : item.quantityReceived > 0
                                ? 'text-yellow-600'
                                : ''
                          }
                        >
                          {item.quantityReceived}
                        </span>
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-right">
                        {formatCurrency(Number(item.unitPrice))}
                      </td>
                      {purchaseOrder.items?.some((i) => i.discountPercentage > 0) && (
                        <td className="py-3 px-2 sm:px-4 text-center">
                          {item.discountPercentage > 0
                            ? `${item.discountPercentage}%`
                            : '-'}
                        </td>
                      )}
                      <td className="py-3 px-2 sm:px-4 text-right font-medium">
                        {formatCurrency(itemTotal)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Totals */}
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader>
            <CardTitle>Resumen de Costos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-medium">
                  {formatCurrency(Number(purchaseOrder.subtotal))}
                </span>
              </div>
              {purchaseOrder.taxAmount && Number(purchaseOrder.taxAmount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Impuesto:</span>
                  <span className="font-medium">
                    {formatCurrency(Number(purchaseOrder.taxAmount))}
                  </span>
                </div>
              )}
              {purchaseOrder.shippingCost && Number(purchaseOrder.shippingCost) > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Envío:</span>
                  <span className="font-medium">
                    {formatCurrency(Number(purchaseOrder.shippingCost))}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(Number(purchaseOrder.totalAmount))}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {purchaseOrder.notes && (
          <Card style={{ borderColor: 'var(--color-primary)' }}>
            <CardHeader>
              <CardTitle>Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{purchaseOrder.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
