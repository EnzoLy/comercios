import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getStoreContext } from '@/lib/auth/store-context'
import { getDataSource } from '@/lib/db'
import { Sale } from '@/lib/db/entities/sale.entity'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Receipt, User, CreditCard } from 'lucide-react'

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

  const sale = await saleRepo.findOne({
    where: { id: saleId, storeId: context.storeId },
    relations: ['items', 'items.product', 'cashier'],
  })

  if (!sale) {
    notFound()
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dashboard/${storeSlug}/sales`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sales
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Sale Details</h1>
          <p className="text-gray-600 dark:text-gray-400">
            #{sale.id.substring(0, 8)}
          </p>
        </div>
        <Badge
          variant={
            sale.status === 'COMPLETED'
              ? 'default'
              : sale.status === 'CANCELLED'
              ? 'destructive'
              : 'secondary'
          }
        >
          {sale.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Amount
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
              Payment Method
            </CardTitle>
            <CreditCard className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sale.paymentMethod}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Cashier
            </CardTitle>
            <User className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">{sale.cashier?.name || 'Unknown'}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Items ({sale.items?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Product</th>
                  <th className="text-center py-3 px-4">Quantity</th>
                  <th className="text-right py-3 px-4">Unit Price</th>
                  <th className="text-right py-3 px-4">Discount</th>
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
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal:</span>
            <span>${Number(sale.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax:</span>
            <span>${Number(sale.tax).toFixed(2)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span>Discount:</span>
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
                <span className="text-gray-600">Amount Paid:</span>
                <span>${Number(sale.amountPaid).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Change:</span>
                <span>${Number(sale.change || 0).toFixed(2)}</span>
              </div>
            </>
          )}

          <div className="mt-4 pt-4 border-t text-sm text-gray-600">
            <div className="flex justify-between mb-1">
              <span>Date:</span>
              <span>{new Date(sale.createdAt).toLocaleString()}</span>
            </div>
            {sale.completedAt && (
              <div className="flex justify-between">
                <span>Completed:</span>
                <span>{new Date(sale.completedAt).toLocaleString()}</span>
              </div>
            )}
          </div>

          {sale.notes && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-1">Notes:</p>
              <p className="text-sm text-gray-600">{sale.notes}</p>
            </div>
          )}

          {sale.customerName && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-1">Customer:</p>
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
