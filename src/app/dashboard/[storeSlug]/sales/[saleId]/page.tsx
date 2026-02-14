import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getStoreContext } from '@/lib/auth/store-context'
import { getDataSource } from '@/lib/db'
import { Sale } from '@/lib/db/entities/sale.entity'
import { DigitalInvoice } from '@/lib/db/entities/digital-invoice.entity'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Receipt, User, CreditCard } from 'lucide-react'
import { SaleInvoiceButton } from './invoice-button'

const statusLabels: Record<string, string> = {
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  PENDING: 'Pendiente',
  REFUNDED: 'Reembolsada',
}

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  MOBILE: 'Móvil',
  CREDIT: 'Crédito',
}

export default async function SaleDetailsPage({
  params,
}: {
  params: Promise<{ storeSlug: string; saleId: string }>
}) {
  const { storeSlug, saleId } = await params
  const context = await getStoreContext(storeSlug)

  if (!context) {
    return null
  }

  const dataSource = await getDataSource()
  const saleRepo = dataSource.getRepository(Sale)
  const invoiceRepo = dataSource.getRepository(DigitalInvoice)

  const sale = await saleRepo.findOne({
    where: { id: saleId, storeId: context.storeId },
    relations: ['items', 'items.product', 'cashier'],
  })

  if (!sale) {
    notFound()
  }

  const existingInvoice = await invoiceRepo.findOne({
    where: { saleId: sale.id },
  })

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dashboard/${storeSlug}/sales`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Ventas
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Detalles de Venta</h1>
          <p className="text-gray-600 dark:text-gray-400">
            #{sale.id.substring(0, 8)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SaleInvoiceButton
            saleId={sale.id}
            storeId={context.storeId}
            existingInvoice={existingInvoice ? {
              id: existingInvoice.id,
              accessToken: existingInvoice.accessToken,
              invoiceNumber: existingInvoice.invoiceNumber,
            } : null}
          />
          <Badge
            variant={
              sale.status === 'COMPLETED'
                ? 'default'
                : sale.status === 'CANCELLED'
                ? 'destructive'
                : 'secondary'
            }
          >
            {statusLabels[sale.status] || sale.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Monto Total
            </CardTitle>
            <Receipt className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(sale.total).toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Método de Pago
            </CardTitle>
            <CreditCard className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{paymentMethodLabels[sale.paymentMethod] || sale.paymentMethod}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Cajero
            </CardTitle>
            <User className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">{sale.cashier?.name || 'Desconocido'}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Productos ({sale.items?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Producto</th>
                  <th className="text-center py-3 px-4">Cantidad</th>
                  <th className="text-right py-3 px-4">Precio Unit.</th>
                  <th className="text-right py-3 px-4">Descuento</th>
                  <th className="text-right py-3 px-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items?.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-gray-500">{item.productSku}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">{item.quantity}</td>
                    <td className="py-3 px-4 text-right">
                      ${Number(item.unitPrice).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-red-600">
                      {item.discount > 0 ? `-$${Number(item.discount).toFixed(2)}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      ${Number(item.total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal:</span>
            <span>${Number(sale.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Impuesto:</span>
            <span>${Number(sale.tax).toFixed(2)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span>Descuento:</span>
              <span>-${Number(sale.discount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Total:</span>
            <span>${Number(sale.total).toFixed(2)}</span>
          </div>

          {sale.paymentMethod === 'CASH' && sale.amountPaid && (
            <>
              <div className="flex justify-between text-sm mt-4">
                <span className="text-gray-600">Monto Recibido:</span>
                <span>${Number(sale.amountPaid).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Cambio:</span>
                <span>${Number(sale.change || 0).toFixed(2)}</span>
              </div>
            </>
          )}

          <div className="mt-4 pt-4 border-t text-sm text-gray-600">
            <div className="flex justify-between mb-1">
              <span>Fecha:</span>
              <span>{new Date(sale.createdAt).toLocaleString('es-ES')}</span>
            </div>
            {sale.completedAt && (
              <div className="flex justify-between">
                <span>Completada:</span>
                <span>{new Date(sale.completedAt).toLocaleString('es-ES')}</span>
              </div>
            )}
          </div>

          {sale.notes && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-1">Notas:</p>
              <p className="text-sm text-gray-600">{sale.notes}</p>
            </div>
          )}

          {sale.customerName && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-1">Cliente:</p>
              <p className="text-sm text-gray-600">{sale.customerName}</p>
              {sale.customerEmail && (
                <p className="text-sm text-gray-600">{sale.customerEmail}</p>
              )}
              {sale.customerPhone && (
                <p className="text-sm text-gray-600">{sale.customerPhone}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
