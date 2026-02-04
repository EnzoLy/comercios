import Link from 'next/link'
import { getStoreContext } from '@/lib/auth/store-context'
import { getDataSource } from '@/lib/db'
import { PurchaseOrder, PurchaseOrderStatus } from '@/lib/db/entities/purchase-order.entity'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, ClipboardList } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'

export default async function PurchaseOrdersPage({
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
  const poRepo = dataSource.getRepository(PurchaseOrder)

  const purchaseOrders = await poRepo.find({
    where: { storeId: context.storeId },
    relations: ['supplier'],
    order: { orderDate: 'DESC' },
  })

  // Calculate stats
  const activeOrders = purchaseOrders.filter(
    (po) =>
      po.status === PurchaseOrderStatus.SENT ||
      po.status === PurchaseOrderStatus.CONFIRMED ||
      po.status === PurchaseOrderStatus.PARTIALLY_RECEIVED
  )

  // Get current month orders
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthOrders = purchaseOrders.filter(
    (po) => new Date(po.orderDate) >= startOfMonth
  )
  const thisMonthTotal = thisMonthOrders.reduce(
    (sum, po) => sum + Number(po.totalAmount),
    0
  )

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
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    )
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date))
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Órdenes de Compra</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Administra las órdenes de compra a proveedores
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href={`/dashboard/${storeSlug}/purchase-orders/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Orden de Compra
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader className="pb-3">
            <CardDescription>Total Órdenes</CardDescription>
            <CardTitle className="text-3xl">{purchaseOrders.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader className="pb-3">
            <CardDescription>Órdenes Activas</CardDescription>
            <CardTitle className="text-3xl">{activeOrders.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader className="pb-3">
            <CardDescription>Total Este Mes</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(thisMonthTotal)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {purchaseOrders.length === 0 ? (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ClipboardList className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aún no hay órdenes de compra</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Comienza creando tu primera orden de compra
            </p>
            <Button asChild>
              <Link href={`/dashboard/${storeSlug}/purchase-orders/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Orden de Compra
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader>
            <CardTitle>Todas las Órdenes ({purchaseOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 sm:px-4">Número de Orden</th>
                    <th className="text-left py-3 px-2 sm:px-4 hidden md:table-cell">
                      Proveedor
                    </th>
                    <th className="text-left py-3 px-2 sm:px-4 hidden lg:table-cell">
                      Fecha de Orden
                    </th>
                    <th className="text-left py-3 px-2 sm:px-4 hidden xl:table-cell">
                      Entrega Esperada
                    </th>
                    <th className="text-center py-3 px-2 sm:px-4">Estado</th>
                    <th className="text-right py-3 px-2 sm:px-4 hidden sm:table-cell">
                      Total
                    </th>
                    <th className="text-right py-3 px-2 sm:px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((po) => (
                    <tr
                      key={po.id}
                      className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="py-3 px-2 sm:px-4">
                        <div>
                          <p className="font-medium text-sm sm:text-base">{po.orderNumber}</p>
                          <p className="text-xs text-gray-500 md:hidden mt-1">
                            {po.supplier?.name}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-2 sm:px-4 hidden md:table-cell">
                        <span className="text-sm">{po.supplier?.name}</span>
                      </td>
                      <td className="py-3 px-2 sm:px-4 hidden lg:table-cell">
                        <span className="text-sm">{formatDate(po.orderDate)}</span>
                      </td>
                      <td className="py-3 px-2 sm:px-4 hidden xl:table-cell">
                        {po.expectedDeliveryDate ? (
                          <span className="text-sm">
                            {formatDate(po.expectedDeliveryDate)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-center">
                        {getStatusBadge(po.status)}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-right hidden sm:table-cell">
                        <span className="font-medium">
                          {formatCurrency(Number(po.totalAmount))}
                        </span>
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-right">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 sm:px-3"
                        >
                          <Link href={`/dashboard/${storeSlug}/purchase-orders/${po.id}`}>
                            <span className="hidden sm:inline">Ver</span>
                            <span className="sm:hidden">•••</span>
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
