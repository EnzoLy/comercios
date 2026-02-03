import Link from 'next/link'
import { getStoreContext } from '@/lib/auth/store-context'
import { getDataSource } from '@/lib/db'
import { Sale, SaleStatus } from '@/lib/db/entities/sale.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, ShoppingCart, Package, AlertTriangle } from 'lucide-react'
import { SalesChart } from '@/components/dashboard/sales-chart'
import { TopProducts } from '@/components/dashboard/top-products'
import { StockAlertsWidget } from '@/components/dashboard/stock-alerts-widget'

export default async function StoreDashboard({
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

  // Get today's sales
  const todaySales = await dataSource
    .getRepository(Sale)
    .createQueryBuilder('sale')
    .where('sale.storeId = :storeId', { storeId: context.storeId })
    .andWhere('DATE(sale.createdAt) = CURRENT_DATE')
    .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
    .getMany()

  const todayRevenue = todaySales.reduce((sum, sale) => sum + Number(sale.total), 0)

  // Get total products
  const totalProducts = await dataSource
    .getRepository(Product)
    .count({ where: { storeId: context.storeId, isActive: true } })

  // Get low stock count
  const lowStockCount = await dataSource
    .getRepository(Product)
    .createQueryBuilder('product')
    .where('product.storeId = :storeId', { storeId: context.storeId })
    .andWhere('product.currentStock <= product.minStockLevel')
    .andWhere('product.isActive = :isActive', { isActive: true })
    .getCount()

  // Get recent sales
  const recentSales = await dataSource
    .getRepository(Sale)
    .find({
      where: { storeId: context.storeId, status: SaleStatus.COMPLETED },
      order: { createdAt: 'DESC' },
      take: 5,
    })

  // Get sales data for chart (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const salesByDay = await dataSource
    .getRepository(Sale)
    .createQueryBuilder('sale')
    .select('DATE(sale.createdAt)', 'date')
    .addSelect('SUM(sale.total)', 'revenue')
    .addSelect('COUNT(*)', 'transactions')
    .where('sale.storeId = :storeId', { storeId: context.storeId })
    .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
    .andWhere('sale.createdAt >= :startDate', { startDate: thirtyDaysAgo })
    .groupBy('DATE(sale.createdAt)')
    .orderBy('DATE(sale.createdAt)', 'ASC')
    .getRawMany()

  // Format sales data for chart
  const salesChartData = salesByDay.map((row) => ({
    date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: Number(row.revenue),
    transactions: Number(row.transactions),
  }))

  // Get top selling products (last 30 days)
  const topProductsData = await dataSource
    .query(
      `
      SELECT
        p.name,
        p.sku,
        SUM(si.quantity) as "quantitySold",
        SUM(si.total) as revenue
      FROM sale_item si
      INNER JOIN product p ON si."productId" = p.id
      INNER JOIN sale s ON si."saleId" = s.id
      WHERE s."storeId" = $1
        AND s.status = $2
        AND s."createdAt" >= $3
      GROUP BY p.id, p.name, p.sku
      ORDER BY revenue DESC
      LIMIT 5
    `,
      [context.storeId, SaleStatus.COMPLETED, thirtyDaysAgo]
    )

  const topProducts = topProductsData.map((row: any) => ({
    name: row.name,
    sku: row.sku,
    quantitySold: Number(row.quantitySold),
    revenue: Number(row.revenue),
  }))

  // Get low stock products
  const lowStockProducts = await dataSource
    .getRepository(Product)
    .createQueryBuilder('product')
    .where('product.storeId = :storeId', { storeId: context.storeId })
    .andWhere('product.currentStock <= product.minStockLevel')
    .andWhere('product.isActive = :isActive', { isActive: true })
    .orderBy('product.currentStock', 'ASC')
    .take(10)
    .getMany()

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Panel de Control</h1>
        <p className="text-gray-600 dark:text-gray-400">
          ¡Bienvenido! Esto es lo que está pasando con tu tienda.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Ingresos de Hoy - Links to Sales */}
        <Link href={`/dashboard/${storeSlug}/sales`}>
          <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Ingresos de Hoy
              </CardTitle>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${todayRevenue.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">
                {todaySales.length} transacciones
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Transacciones - Links to Sales */}
        <Link href={`/dashboard/${storeSlug}/sales`}>
          <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Transacciones
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todaySales.length}</div>
              <p className="text-xs text-gray-500 mt-1">Hoy</p>
            </CardContent>
          </Card>
        </Link>

        {/* Total de Productos - Links to Products */}
        <Link href={`/dashboard/${storeSlug}/products`}>
          <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-green-300 dark:hover:border-green-600">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total de Productos
              </CardTitle>
              <Package className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts}</div>
              <p className="text-xs text-gray-500 mt-1">Productos activos</p>
            </CardContent>
          </Card>
        </Link>

        {/* Alertas de Stock Bajo - Links to Inventory */}
        <Link href={`/dashboard/${storeSlug}/inventory`}>
          <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-600">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Alertas de Stock Bajo
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockCount}</div>
              <p className="text-xs text-gray-500 mt-1">Productos bajo el mínimo</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Sales Chart and Top Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="lg:col-span-2">
          <SalesChart data={salesChartData} />
        </div>
        <div>
          <TopProducts products={topProducts} storeSlug={storeSlug} />
        </div>
      </div>

      {/* Stock Alerts and Recent Sales Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <StockAlertsWidget alerts={lowStockProducts} storeSlug={storeSlug} />

        <Link href={`/dashboard/${storeSlug}/sales`}>
          <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-600 h-full">
            <CardHeader>
              <CardTitle>Ventas Recientes</CardTitle>
              <CardDescription>Últimas transacciones de tu tienda</CardDescription>
            </CardHeader>
            <CardContent>
              {recentSales.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aún no hay ventas</p>
              ) : (
                <div className="space-y-4">
                  {recentSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between border-b pb-2 last:border-0"
                    >
                      <div>
                        <p className="font-medium">${Number(sale.total).toFixed(2)}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(sale.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{sale.paymentMethod}</p>
                        <p className="text-xs text-gray-500">{sale.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
