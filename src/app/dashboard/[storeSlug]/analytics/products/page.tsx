'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useStore } from '@/hooks/use-store'
import { toast } from 'sonner'
import { TrendingUp, TrendingDown, Zap, AlertCircle, Award, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DateRangeSelector } from '@/components/analytics/shared/DateRangeSelector'
import { MetricDisplay } from '@/components/analytics/shared/MetricDisplay'
import { BarComparisonChart } from '@/components/analytics/charts/BarComparisonChart'
import { PieDistributionChart } from '@/components/analytics/charts/PieDistributionChart'
import { ExportButton } from '@/components/analytics/shared/ExportButton'
import { LoadingState } from '@/components/analytics/shared/LoadingState'
import { EmptyState } from '@/components/analytics/shared/EmptyState'
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/analytics/chart-utils'

interface ProductAnalytics {
  productId: string
  productName: string
  sku: string
  categoryName: string | null
  quantitySold: number
  revenue: string
  avgPrice: string
  costPrice: string
  profit: string
  marginPercentage: string
  transactions: number
  totalTaxAmount: string
}

interface ProductSummary {
  totalRevenue: string
  totalProfit: string
  totalQuantity: number
  totalTaxAmount: string
  avgMarginPercentage: string
}

export default function ProductsPage() {
  const params = useParams()
  const storeSlug = params.storeSlug as string
  const store = useStore()

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<ProductAnalytics[]>([])
  const [summary, setSummary] = useState<ProductSummary | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'revenue' | 'margin' | 'quantity'>('quantity')

  // Initialize date range (last 30 days)
  useEffect(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    setEndDate(now.toISOString().split('T')[0])
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0])
  }, [])

  // Fetch product analytics data
  useEffect(() => {
    if (!startDate || !endDate || !store) return

    const fetchProductData = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/stores/${store.storeId}/analytics/sales-by-product?startDate=${startDate}&endDate=${endDate}`
        )

        if (!response.ok) {
          const errorData = await response.json()
          console.error('API Error:', errorData)
          throw new Error(errorData.error || 'Failed to fetch product data')
        }

        const result = await response.json()
        setProducts(result.data)
        setSummary(result.summary)
      } catch (error) {
        console.error('Error fetching product data:', error)
        const errorMsg = error instanceof Error ? error.message : 'Failed to load product data'
        toast.error(errorMsg)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProductData()
  }, [startDate, endDate, store])

  const handleDateChange = (newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate)
    setEndDate(newEndDate)
  }

  // Filter products
  const filteredProducts = products.filter(
    (p) =>
      p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'revenue') {
      return parseFloat(b.revenue) - parseFloat(a.revenue)
    } else if (sortBy === 'margin') {
      return parseFloat(b.marginPercentage) - parseFloat(a.marginPercentage)
    }
    return b.quantitySold - a.quantitySold
  })

  // Sort all products by revenue (for chart and KPIs)
  const allProductsSortedByRevenue = [...products].sort((a, b) =>
    parseFloat(b.revenue) - parseFloat(a.revenue)
  )

  // Get top 10 for chart
  const topProducts = allProductsSortedByRevenue.slice(0, 10)

  const chartData = topProducts.map((p) => ({
    name: p.productName || 'Desconocido',
    quantity: p.quantitySold,
  }))

  const getMarginBadge = (margin: string) => {
    const marginNum = parseFloat(margin)
    if (marginNum >= 40) {
      return <Badge style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>Margen Alto</Badge>
    }
    if (marginNum < 0) {
      return <Badge className="bg-red-100 text-red-800">Pérdida</Badge>
    }
    if (marginNum < 20) {
      return <Badge style={{ backgroundColor: 'var(--color-secondary)', color: 'white' }}>Margen Bajo</Badge>
    }
    return <Badge style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}>Normal</Badge>
  }

  // Calculate KPIs based on ALL products (not filtered)
  const bestProduct = allProductsSortedByRevenue.length > 0 ? allProductsSortedByRevenue[0] : null
  const worstMarginProduct = [...products].sort((a, b) => parseFloat(a.marginPercentage || '0') - parseFloat(b.marginPercentage || '0'))[0] || null
  const lowestPerformer = [...products].sort((a, b) => a.quantitySold - b.quantitySold)[0] || null

  const avgRevenuePerProduct = summary && products.length > 0 ? parseFloat(summary.totalRevenue) / products.length : 0
  const profitMargin = summary && parseFloat(summary.totalRevenue) > 0
    ? ((parseFloat(summary.totalProfit) / parseFloat(summary.totalRevenue)) * 100).toFixed(2)
    : '0.00'

  // Category breakdown
  const categoryData = products.reduce((acc, product) => {
    const category = product.categoryName?.trim() || 'Sin categoría'
    const revenue = parseFloat(product.revenue) || 0
    if (revenue > 0) {
      const existing = acc.find(c => c.name === category)
      if (existing) {
        existing.value += revenue
      } else {
        acc.push({ name: category, value: revenue })
      }
    }
    return acc
  }, [] as Array<{ name: string; value: number }>).filter(item => item.value > 0)

  const marginDistribution = [
    {
      name: 'Margen > 40%',
      value: products.filter(p => parseFloat(p.marginPercentage || '0') > 40).length,
      id: 'margin-40plus',
    },
    {
      name: '20% - 40%',
      value: products.filter(p => {
        const margin = parseFloat(p.marginPercentage || '0')
        return margin >= 20 && margin <= 40
      }).length,
      id: 'margin-20-40',
    },
    {
      name: '0% - 20%',
      value: products.filter(p => {
        const margin = parseFloat(p.marginPercentage || '0')
        return margin > 0 && margin < 20
      }).length,
      id: 'margin-0-20',
    },
    {
      name: 'Negativo',
      value: products.filter(p => parseFloat(p.marginPercentage || '0') <= 0).length,
      id: 'margin-negative',
    },
  ].filter(item => item.value > 0)

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Analítica de Productos</h1>
          <p className="text-muted-foreground mt-2">
            Seguimiento detallado de ventas, márgenes y rentabilidad por producto
          </p>
        </div>
      </div>

      {/* Date Range Selector */}
      <DateRangeSelector startDate={startDate} endDate={endDate} onDateChange={handleDateChange} />

      {/* Main Summary Metrics */}
      {isLoading ? (
        <LoadingState type="card" count={6} />
      ) : !summary ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <MetricDisplay
              title="Ingresos Totales"
              value={summary.totalRevenue}
              icon="💰"
              format="currency"
            />
            <MetricDisplay
              title="Ganancia Total"
              value={summary.totalProfit}
              icon="📈"
              format="currency"
              highlight={parseFloat(summary.totalProfit) > 0}
            />
            <MetricDisplay
              title="Margen de Ganancia"
              value={profitMargin}
              icon="%"
              format="percentage"
            />
            <MetricDisplay
              title="Unidades Vendidas"
              value={summary.totalQuantity}
              icon="📦"
              format="number"
            />
            <MetricDisplay
              title="Productos"
              value={sortedProducts.length}
              icon="🏷️"
              format="number"
            />
            <MetricDisplay
              title="Ingreso Promedio/Producto"
              value={avgRevenuePerProduct.toFixed(2)}
              icon="💵"
              format="currency"
            />
          </div>

          {/* KPI Cards - Top, Bottom, and Best Margin */}
          {products.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Best Performer */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      🏆 Top Producto
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-bold truncate">{bestProduct?.productName || 'Sin datos'}</p>
                    <p className="text-2xl font-bold">{formatCurrency(bestProduct?.revenue || '0')}</p>
                    <p className="text-xs text-muted-foreground">
                      {bestProduct?.quantitySold || 0} unidades vendidas
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Worst Margin */}
              {worstMarginProduct && (
                <Card className="border-l-4 border-l-orange-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        ⚠️ Margen Crítico
                      </CardTitle>
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="font-bold truncate">{worstMarginProduct.productName || 'Desconocido'}</p>
                      <p className="text-2xl font-bold">
                        {formatPercentage(parseFloat(worstMarginProduct.marginPercentage || '0'))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {worstMarginProduct.quantitySold} unidades en período
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Lowest Performer */}
              {lowestPerformer && (
                <Card className="border-l-4 border-l-yellow-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        📉 Bajo Movimiento
                      </CardTitle>
                      <TrendingDown className="h-4 w-4 text-yellow-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="font-bold truncate">{lowestPerformer.productName || 'Desconocido'}</p>
                      <p className="text-2xl font-bold">{lowestPerformer.quantitySold}</p>
                      <p className="text-xs text-muted-foreground">
                        Unidades vendidas en el período
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products by Quantity */}
        {isLoading ? (
          <LoadingState type="chart" />
        ) : chartData.length === 0 ? (
          <EmptyState />
        ) : (
          <Card style={{ borderColor: 'var(--color-primary)' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top 10 Productos por Cantidad
              </CardTitle>
              <CardDescription>Más unidades vendidas en el período</CardDescription>
            </CardHeader>
            <CardContent>
              <BarComparisonChart
                data={chartData}
                dataKey="quantity"
                nameKey="name"
                color="#3b82f6"
                layout="vertical"
                height={Math.max(300, topProducts.length * 35)}
                formatValue={(value) => formatNumber(value)}
              />
            </CardContent>
          </Card>
        )}

        {/* Margin Distribution */}
        {!isLoading && marginDistribution.length > 0 && (
          <Card style={{ borderColor: 'var(--color-secondary)' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Distribución de Márgenes
              </CardTitle>
              <CardDescription>Productos por rango de margen</CardDescription>
            </CardHeader>
            <CardContent>
              <PieDistributionChart
                data={marginDistribution}
                height={300}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Category and Revenue Analysis */}
      {!isLoading && categoryData.length > 0 && (
        <Card style={{ borderColor: 'var(--color-accent)' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Ingresos por Categoría
            </CardTitle>
            <CardDescription>Desglose de ingresos por categoría de producto</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {categoryData.sort((a, b) => b.value - a.value).map((cat) => (
                <div key={cat.name} className="p-4 rounded-lg bg-secondary/20 border">
                  <p className="text-sm text-muted-foreground truncate">{cat.name}</p>
                  <p className="text-2xl font-bold mt-2">{formatCurrency(cat.value.toFixed(2))}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {((cat.value / (summary ? parseFloat(summary.totalRevenue) : 1)) * 100).toFixed(1)}% del total
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Data Table */}
      {isLoading ? (
        <LoadingState type="table" />
      ) : sortedProducts.length === 0 ? (
        <EmptyState />
      ) : (
        <Card style={{ borderColor: 'var(--color-accent)' }}>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Análisis Detallado de Productos</CardTitle>
              <CardDescription>
                {sortedProducts.length} de {products.length} productos — Ordenado por {sortBy === 'revenue' ? 'Ingresos' : sortBy === 'margin' ? 'Margen' : 'Cantidad'}
              </CardDescription>
            </div>
            <ExportButton
              data={sortedProducts.map((p) => ({
                'Producto': p.productName,
                'SKU': p.sku,
                'Categoría': p.categoryName || 'Sin categoría',
                'Cantidad': p.quantitySold,
                'Transacciones': p.transactions,
                'Ingresos': p.revenue,
                'Impuestos': p.totalTaxAmount,
                'Costo': p.costPrice,
                'Ganancia': p.profit,
                'Margen %': p.marginPercentage,
                'Precio Promedio': p.avgPrice,
              }))}
              filename={`productos-analytics-${startDate}-a-${endDate}`}
            />
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Buscar Productos</label>
                  <Input
                    placeholder="Buscar por nombre o SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Ordenar Por</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="mt-2 w-full px-3 py-2 border border-input rounded-md bg-background"
                  >
                    <option value="revenue">💰 Ingresos (Mayor a Menor)</option>
                    <option value="margin">📈 Margen de Ganancia (Mayor a Menor)</option>
                    <option value="quantity">📦 Cantidad Vendida (Mayor a Menor)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Transacciones</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Ganancia</TableHead>
                    <TableHead className="text-right">Margen %</TableHead>
                    <TableHead className="text-right">Precio Promedio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedProducts.map((product, idx) => {
                    const margin = parseFloat(product.marginPercentage)
                    const profit = parseFloat(product.profit)
                    return (
                      <TableRow key={product.productId} className={idx % 2 === 0 ? 'bg-muted/20' : ''}>
                        <TableCell className="font-medium max-w-xs">
                          <div>
                            <p className="font-bold">{product.productName}</p>
                            <p className="text-xs text-muted-foreground">{product.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.categoryName ? (
                            <Badge variant="outline">{product.categoryName}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Sin categoría</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{product.quantitySold}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">{product.transactions}</TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(product.revenue)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          <span style={{ color: profit > 0 ? 'var(--color-primary)' : '#ef4444' }}>
                            {formatCurrency(product.profit)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {margin >= 40 && <span className="text-lg">⭐</span>}
                            {margin > 0 ? (
                              <TrendingUp className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                            ) : (
                              <TrendingDown className="h-4 w-4" style={{ color: '#ef4444' }} />
                            )}
                            <span style={{ color: margin > 0 ? 'var(--color-primary)' : '#ef4444' }} className="font-semibold min-w-[50px] text-right">
                              {formatPercentage(margin)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(product.avgPrice)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {sortedProducts.length > 10 && (
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Mostrando {sortedProducts.length} productos en total
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
