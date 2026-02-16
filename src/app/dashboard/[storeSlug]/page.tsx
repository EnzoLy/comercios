import Link from 'next/link'
import { getStoreContext } from '@/lib/auth/store-context'
import { getDataSource } from '@/lib/db'
import { Sale, SaleStatus } from '@/lib/db/entities/sale.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DollarSign, ShoppingCart, Package, AlertTriangle, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SalesChart } from '@/components/dashboard/sales-chart'

import { TopProducts } from '@/components/dashboard/top-products'
import { StockAlertsWidget } from '@/components/dashboard/stock-alerts-widget'
import { PriceAlertsWidget } from '@/components/suppliers/price-alerts-widget'

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
      ORDER BY "quantitySold" DESC
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
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">
            Panel de <span className="gradient-text">Control</span>
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            ¡Bienvenido! Esto es lo que está pasando con tu tienda hoy.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-4 py-2 rounded-xl backdrop-blur-sm">
          <Calendar className="h-4 w-4" />
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Ingresos de Hoy */}
        <Link href={`/dashboard/${storeSlug}/sales`}>
          <Card className="group relative overflow-hidden border-none gradient-bg text-white shadow-primary/20">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <DollarSign className="h-24 w-24" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-white/80">
                Ingresos de Hoy
              </CardTitle>
              <DollarSign className="h-4 w-4 text-white/80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">${todayRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-white/60 mt-2 font-medium flex items-center gap-1">
                <ShoppingCart className="h-3 w-3" />
                {todaySales.length} transacciones hoy
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Transacciones */}
        <Link href={`/dashboard/${storeSlug}/sales`}>
          <Card className="group relative overflow-hidden border bg-card text-foreground shadow-lg shadow-indigo-500/5 transition-all hover:bg-card/90">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
              <ShoppingCart className="h-24 w-24" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider opacity-60">
                Transacciones
              </CardTitle>
              <ShoppingCart className="h-4 w-4 opacity-60" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{todaySales.length}</div>
              <p className="text-xs opacity-60 mt-2 font-medium">Ventas realizadas hoy</p>
            </CardContent>
          </Card>
        </Link>

        {/* Total de Productos */}
        <Link href={`/dashboard/${storeSlug}/products`}>
          <Card className="group relative overflow-hidden border bg-card text-foreground shadow-lg shadow-slate-950/5 transition-all hover:bg-card/90">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
              <Package className="h-24 w-24" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider opacity-60">
                Catálogo
              </CardTitle>
              <Package className="h-4 w-4 opacity-60" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{totalProducts}</div>
              <p className="text-xs opacity-60 mt-2 font-medium">Productos disponibles</p>
            </CardContent>
          </Card>
        </Link>

        {/* Alertas de Stock Bajo */}
        <Link href={`/dashboard/${storeSlug}/inventory`}>
          <Card className={cn(
            "group relative overflow-hidden border-none text-white shadow-orange-500/20",
            lowStockCount > 0 ? "bg-orange-600" : "bg-green-600"
          )}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <AlertTriangle className="h-24 w-24" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-white/80">
                Estado Stock
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-white/80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{lowStockCount}</div>
              <p className="text-xs text-white/60 mt-2 font-medium">Alertas activas</p>
            </CardContent>
          </Card>
        </Link>
      </div>


      {/* Sales Chart and Top Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <SalesChart data={salesChartData} />
        </div>
        <div>
          <TopProducts products={topProducts} storeSlug={storeSlug} />
        </div>
      </div>

      {/* Stock Alerts, Price Alerts, and Recent Sales Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <StockAlertsWidget alerts={lowStockProducts} storeSlug={storeSlug} />

        <Card className="h-full border-gray-100 dark:border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">Ventas Recientes</CardTitle>
              <CardDescription>Últimas transacciones de tu tienda</CardDescription>
            </div>
            <Link href={`/dashboard/${storeSlug}/sales`}>
              <Button variant="outline" size="sm" className="rounded-xl">Ver todas</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 opacity-20 mb-4" />
                <p>Aún no hay ventas registradas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/10 hover:bg-secondary/20 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-full bg-primary/10">
                        <DollarSign className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-lg">${Number(sale.total).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="rounded-lg font-bold">{sale.paymentMethod}</Badge>
                      <p className="text-[10px] uppercase font-bold tracking-tighter text-muted-foreground mt-1">{sale.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Price Alerts Widget */}
      <div className="mb-8">
        <PriceAlertsWidget storeId={context.storeId} storeSlug={storeSlug} limit={5} />
      </div>
    </div>
  )
}
