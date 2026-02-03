import Link from 'next/link'
import { getStoreContext } from '@/lib/auth/store-context'
import { getDataSource } from '@/lib/db'
import { Sale, SaleStatus } from '@/lib/db/entities/sale.entity'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Receipt, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react'

export default async function SalesPage({
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
  const saleRepo = dataSource.getRepository(Sale)

  // Get all sales
  const sales = await saleRepo.find({
    where: { storeId: context.storeId },
    relations: ['cashier'],
    order: { createdAt: 'DESC' },
    take: 50,
  })

  // Calculate stats
  const completedSales = sales.filter((s) => s.status === SaleStatus.COMPLETED)
  const totalRevenue = completedSales.reduce((sum, sale) => sum + Number(sale.total), 0)
  const todaySales = completedSales.filter(
    (s) => new Date(s.createdAt).toDateString() === new Date().toDateString()
  )
  const todayRevenue = todaySales.reduce((sum, sale) => sum + Number(sale.total), 0)

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Ventas</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Visualiza y gestiona tus transacciones de ventas
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Ingresos Totales
            </CardTitle>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">
              {completedSales.length} ventas completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Ingresos de Hoy
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${todayRevenue.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">
              {todaySales.length} transacciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Venta Promedio
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${completedSales.length > 0 ? (totalRevenue / completedSales.length).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Por transacción</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ventas Recientes</CardTitle>
          <CardDescription>Últimas 50 transacciones</CardDescription>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <div className="text-center py-16">
              <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aún no hay ventas</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Comienza realizando ventas desde el POS
              </p>
              <Button asChild>
                <Link href={`/dashboard/${storeSlug}/pos`}>Ir al POS</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 sm:px-4">Fecha</th>
                    <th className="text-left py-3 px-2 sm:px-4 hidden md:table-cell">Cajero</th>
                    <th className="text-left py-3 px-2 sm:px-4 hidden sm:table-cell">Pago</th>
                    <th className="text-right py-3 px-2 sm:px-4">Total</th>
                    <th className="text-center py-3 px-2 sm:px-4">Estado</th>
                    <th className="text-right py-3 px-2 sm:px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-2 sm:px-4">
                        <div>
                          <p className="font-medium text-sm">
                            {new Date(sale.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-2 sm:px-4 hidden md:table-cell">
                        <p className="text-sm">{sale.cashier?.name || 'Desconocido'}</p>
                      </td>
                      <td className="py-3 px-2 sm:px-4 hidden sm:table-cell">
                        <Badge variant="outline" className="text-xs">{sale.paymentMethod}</Badge>
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-right font-semibold text-sm sm:text-base">
                        ${Number(sale.total).toFixed(2)}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-center">
                        <Badge
                          variant={
                            sale.status === SaleStatus.COMPLETED
                              ? 'default'
                              : sale.status === SaleStatus.CANCELLED
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {sale.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-right">
                        <Button asChild variant="ghost" size="sm" className="h-8 px-2 sm:px-3">
                          <Link href={`/dashboard/${storeSlug}/sales/${sale.id}`}>
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
