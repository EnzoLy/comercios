'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useStore } from '@/hooks/use-store'
import { toast } from 'sonner'
import { TrendingUp, TrendingDown, Award, Zap, AlertCircle, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DateRangeSelector } from '@/components/analytics/shared/DateRangeSelector'
import { MetricDisplay } from '@/components/analytics/shared/MetricDisplay'
import { BarComparisonChart } from '@/components/analytics/charts/BarComparisonChart'
import { PieDistributionChart } from '@/components/analytics/charts/PieDistributionChart'
import { ExportButton } from '@/components/analytics/shared/ExportButton'
import { LoadingState } from '@/components/analytics/shared/LoadingState'
import { EmptyState } from '@/components/analytics/shared/EmptyState'
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/analytics/chart-utils'

interface CategoryAnalytics {
  categoryId: string
  categoryName: string
  productsCount: number
  quantitySold: number
  revenue: string
  avgPerProduct: string
  percentageOfTotal: string
}

interface CategorySummary {
  totalRevenue: string
  totalQuantity: number
  totalCategories: number
}

export default function CategoriesPage() {
  const params = useParams()
  const storeSlug = params.storeSlug as string
  const store = useStore()

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<CategoryAnalytics[]>([])
  const [summary, setSummary] = useState<CategorySummary | null>(null)

  // Initialize date range (last 30 days)
  useEffect(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    setEndDate(now.toISOString().split('T')[0])
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0])
  }, [])

  // Fetch category analytics data
  useEffect(() => {
    if (!startDate || !endDate || !store) return

    const fetchCategoryData = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/stores/${store.storeId}/analytics/sales-by-category?startDate=${startDate}&endDate=${endDate}`
        )

        if (!response.ok) {
          const errorData = await response.json()
          console.error('API Error:', errorData)
          throw new Error(errorData.error || 'Failed to fetch category data')
        }

        const result = await response.json()
        setCategories(result.data)
        setSummary(result.summary)
      } catch (error) {
        console.error('Error fetching category data:', error)
        const errorMsg = error instanceof Error ? error.message : 'Failed to load category data'
        toast.error(errorMsg)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategoryData()
  }, [startDate, endDate, store])

  const handleDateChange = (newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate)
    setEndDate(newEndDate)
  }

  // Sort by quantity descending
  const sortedCategories = [...categories].sort(
    (a, b) => b.quantitySold - a.quantitySold
  )

  const chartData = sortedCategories.map((c) => ({
    name: c.categoryName,
    quantity: c.quantitySold,
  }))

  // Calculate KPIs
  const topCategory = sortedCategories.length > 0 ? sortedCategories[0] : null
  const avgRevenuePerCategory = summary && sortedCategories.length > 0 ? parseFloat(summary.totalRevenue) / sortedCategories.length : 0
  const avgProductsPerCategory = summary && sortedCategories.length > 0 ? Math.round(
    sortedCategories.reduce((sum, c) => sum + c.productsCount, 0) / sortedCategories.length
  ) : 0

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Análisis por Categoría</h1>
          <p className="text-muted-foreground mt-2">
            Desglose detallado de ventas, rentabilidad y desempeño por categoría
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
              title="Unidades Vendidas"
              value={summary.totalQuantity}
              icon="📦"
              format="number"
            />
            <MetricDisplay
              title="Total Categorías"
              value={summary.totalCategories}
              icon="🏷️"
              format="number"
            />
            <MetricDisplay
              title="Ingreso Promedio"
              value={avgRevenuePerCategory.toFixed(2)}
              icon="💵"
              format="currency"
            />
            <MetricDisplay
              title="Productos por Categoría"
              value={avgProductsPerCategory}
              icon="📊"
              format="number"
            />
            <MetricDisplay
              title="Categorías Activas"
              value={sortedCategories.length}
              icon="✨"
              format="number"
            />
          </div>

          {/* Top Category KPI */}
          {topCategory && (
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    🏆 Categoría Top
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-bold text-lg">{topCategory.categoryName}</p>
                  <p className="text-2xl font-bold">{formatCurrency(topCategory.revenue)}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{topCategory.quantitySold} unidades</span>
                    <span>•</span>
                    <span>{topCategory.productsCount} productos</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Quantities */}
        {isLoading ? (
          <LoadingState type="chart" />
        ) : chartData.length === 0 ? (
          <EmptyState />
        ) : (
          <Card style={{ borderColor: 'var(--color-secondary)' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Distribución por Cantidad
              </CardTitle>
              <CardDescription>Proporción de unidades vendidas por categoría</CardDescription>
            </CardHeader>
            <CardContent>
              <PieDistributionChart
                data={chartData}
                dataKey="quantity"
                nameKey="name"
                variant="donut"
                height={350}
                formatValue={(value) => formatNumber(value)}
              />
            </CardContent>
          </Card>
        )}

        {/* Revenue Distribution */}
        {isLoading ? (
          <LoadingState type="chart" />
        ) : sortedCategories.length === 0 ? (
          <EmptyState />
        ) : (
          <Card style={{ borderColor: 'var(--color-accent)' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Distribución de Ingresos
              </CardTitle>
              <CardDescription>Proporción de ingresos por categoría</CardDescription>
            </CardHeader>
            <CardContent>
              <PieDistributionChart
                data={sortedCategories.map(c => ({
                  name: c.categoryName,
                  value: parseFloat(c.revenue),
                  id: c.categoryId,
                }))}
                dataKey="value"
                nameKey="name"
                variant="donut"
                height={350}
                formatValue={(value) => formatCurrency(value.toString())}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bar Chart - Products Count */}
      {!isLoading && sortedCategories.length > 0 && (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 Productos por Categoría
            </CardTitle>
            <CardDescription>Cantidad de productos activos en cada categoría</CardDescription>
          </CardHeader>
          <CardContent>
            <BarComparisonChart
              data={sortedCategories.map(c => ({
                name: c.categoryName,
                quantity: c.productsCount,
              }))}
              dataKey="quantity"
              nameKey="name"
              color="#8b5cf6"
              layout="vertical"
              height={Math.max(300, sortedCategories.length * 40)}
              formatValue={(value) => formatNumber(value)}
            />
          </CardContent>
        </Card>
      )}

      {/* Detailed Data Table */}
      {isLoading ? (
        <LoadingState type="table" />
      ) : sortedCategories.length === 0 ? (
        <EmptyState
          title="No se encontraron categorías"
          description="Los productos deben estar asignados a categorías para ver analíticas"
        />
      ) : (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Análisis Detallado de Categorías</CardTitle>
              <CardDescription>
                {sortedCategories.length} categorías analizadas — {summary?.totalQuantity} unidades vendidas
              </CardDescription>
            </div>
            <ExportButton
              data={sortedCategories.map((c) => ({
                'Categoría': c.categoryName,
                'Productos': c.productsCount,
                'Unidades': c.quantitySold,
                'Ingresos': c.revenue,
                'Promedio/Producto': c.avgPerProduct,
                '% Total': c.percentageOfTotal,
              }))}
              filename={`categorias-analytics-${startDate}-a-${endDate}`}
            />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-1/4">Categoría</TableHead>
                    <TableHead className="text-right w-1/6">Productos</TableHead>
                    <TableHead className="text-right w-1/6">Unidades</TableHead>
                    <TableHead className="text-right w-1/5">Ingresos</TableHead>
                    <TableHead className="text-right w-1/5">% del Total</TableHead>
                    <TableHead className="text-right w-1/6">Promedio/Producto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCategories.map((category, idx) => {
                    const percentage = parseFloat(category.percentageOfTotal)
                    return (
                      <TableRow key={category.categoryId} className={idx % 2 === 0 ? 'bg-muted/20' : ''}>
                        <TableCell className="font-bold">
                          {idx === 0 && <span className="mr-2">🥇</span>}
                          {category.categoryName}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {category.productsCount}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {category.quantitySold}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(category.revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                              <div
                                className="h-2 rounded-full"
                                style={{
                                  width: `${Math.min(percentage, 100)}%`,
                                  backgroundColor: percentage > 20 ? 'var(--color-primary)' : 'var(--color-secondary)',
                                }}
                              />
                            </div>
                            <span className="font-semibold min-w-[40px] text-right">
                              {formatPercentage(percentage)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(category.avgPerProduct)}
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
