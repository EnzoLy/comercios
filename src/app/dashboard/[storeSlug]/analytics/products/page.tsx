'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useStore } from '@/hooks/use-store'
import { toast } from 'sonner'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DateRangeSelector } from '@/components/analytics/shared/DateRangeSelector'
import { MetricDisplay } from '@/components/analytics/shared/MetricDisplay'
import { BarComparisonChart } from '@/components/analytics/charts/BarComparisonChart'
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

  // Get top 10 for chart
  const topProducts = sortedProducts.slice(0, 10)

  const chartData = topProducts.map((p) => ({
    name: p.productName,
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

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analítica de Productos</h1>
        <p className="text-muted-foreground mt-2">
          Analizar ventas de productos, ingresos y márgenes de ganancia
        </p>
      </div>

      {/* Date Range Selector */}
      <DateRangeSelector startDate={startDate} endDate={endDate} onDateChange={handleDateChange} />

      {/* Summary Metrics */}
      {isLoading ? (
        <LoadingState type="card" count={4} />
      ) : !summary ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricDisplay
            title="Ingresos Totales"
            value={summary.totalRevenue}
            icon="💰"
            format="currency"
          />
          <MetricDisplay
            title="Impuestos Totales"
            value={summary.totalTaxAmount}
            icon="🧾"
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
            title="Unidades Vendidas"
            value={summary.totalQuantity}
            icon="📦"
            format="number"
          />
          <MetricDisplay
            title="Margen Promedio"
            value={summary.avgMarginPercentage}
            icon="%"
            format="percentage"
          />
        </div>
      )}

      {/* Chart */}
      {isLoading ? (
        <LoadingState type="chart" />
      ) : chartData.length === 0 ? (
        <EmptyState />
      ) : (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader>
            <CardTitle>Top 10 Productos por Cantidad Vendida</CardTitle>
            <CardDescription>Productos con más unidades vendidas en el período seleccionado</CardDescription>
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

      {/* Search and Sort */}
      {!isLoading && products.length > 0 && (
        <Card style={{ borderColor: 'var(--color-secondary)' }}>
          <CardContent className="pt-6">
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
                  <option value="revenue">Ingresos</option>
                  <option value="margin">Margen de Ganancia</option>
                  <option value="quantity">Cantidad Vendida</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      {isLoading ? (
        <LoadingState type="table" />
      ) : sortedProducts.length === 0 ? (
        <EmptyState />
      ) : (
        <Card style={{ borderColor: 'var(--color-accent)' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Detalles del Producto</CardTitle>
              <CardDescription>
                Mostrando {sortedProducts.length} de {products.length} productos
              </CardDescription>
            </div>
            <ExportButton
              data={sortedProducts.map((p) => ({
                'Nombre del Producto': p.productName,
                'SKU': p.sku,
                'Categoría': p.categoryName || 'Sin categoría',
                'Cant. Vendida': p.quantitySold,
                'Ingresos': p.revenue,
                'Impuestos': p.totalTaxAmount,
                'Precio Promedio': p.avgPrice,
                'Precio de Costo': p.costPrice,
                'Ganancia': p.profit,
                'Margen %': p.marginPercentage,
                'Transacciones': p.transactions,
              }))}
              filename={`analítica-productos-${startDate}-a-${endDate}`}
            />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Cant. Vendida</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Impuestos</TableHead>
                    <TableHead className="text-right">Precio Promedio</TableHead>
                    <TableHead className="text-right">Precio de Costo</TableHead>
                    <TableHead className="text-right">Ganancia</TableHead>
                    <TableHead className="text-right">Margen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedProducts.map((product) => {
                    const margin = parseFloat(product.marginPercentage)
                    return (
                      <TableRow key={product.productId}>
                        <TableCell className="font-medium">
                          <div>
                            <p>{product.productName}</p>
                            <p className="text-xs text-muted-foreground">{product.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell>{product.categoryName || 'Sin categoría'}</TableCell>
                        <TableCell className="text-right">{product.quantitySold}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(product.revenue)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(product.totalTaxAmount)}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(product.avgPrice)}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {formatCurrency(product.costPrice)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <span style={{ color: margin > 0 ? 'var(--color-primary)' : '#ef4444' }}>
                            {formatCurrency(product.profit)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {margin > 0 ? (
                              <TrendingUp className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                            ) : (
                              <TrendingDown className="h-4 w-4" style={{ color: '#ef4444' }} />
                            )}
                            <span style={{ color: margin > 0 ? 'var(--color-primary)' : '#ef4444' }}>
                              {formatPercentage(margin)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
