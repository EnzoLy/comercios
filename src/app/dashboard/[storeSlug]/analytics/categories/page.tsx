'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useStore } from '@/hooks/use-store'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DateRangeSelector } from '@/components/analytics/shared/DateRangeSelector'
import { MetricDisplay } from '@/components/analytics/shared/MetricDisplay'
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

  // Sort by revenue descending
  const sortedCategories = [...categories].sort(
    (a, b) => parseFloat(b.revenue) - parseFloat(a.revenue)
  )

  const chartData = sortedCategories.map((c) => ({
    name: c.categoryName,
    revenue: parseFloat(c.revenue),
  }))

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Análisis por Categoría</h1>
        <p className="text-muted-foreground mt-2">
          Ver desglose de ventas por categoría de producto
        </p>
      </div>

      {/* Date Range Selector */}
      <DateRangeSelector startDate={startDate} endDate={endDate} onDateChange={handleDateChange} />

      {/* Summary Metrics */}
      {isLoading ? (
        <LoadingState type="card" count={3} />
      ) : !summary ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricDisplay
            title="Ingresos Totales"
            value={summary.totalRevenue}
            icon="💰"
            format="currency"
          />
          <MetricDisplay
            title="Unidades Totales Vendidas"
            value={summary.totalQuantity}
            icon="📦"
            format="number"
          />
          <MetricDisplay
            title="Categorías"
            value={summary.totalCategories}
            icon="📂"
            format="number"
          />
        </div>
      )}

      {/* Pie Chart */}
      {isLoading ? (
        <LoadingState type="chart" />
      ) : chartData.length === 0 ? (
        <EmptyState />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Ingresos por Categoría</CardTitle>
            <CardDescription>Proporción de ventas de cada categoría</CardDescription>
          </CardHeader>
          <CardContent>
            <PieDistributionChart
              data={chartData}
              dataKey="revenue"
              nameKey="name"
              variant="donut"
              height={400}
              formatValue={(value) => formatCurrency(value)}
            />
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      {isLoading ? (
        <LoadingState type="table" />
      ) : sortedCategories.length === 0 ? (
        <EmptyState
          title="No se encontraron categorías"
          description="Los productos deben estar asignados a categorías para ver analíticas"
        />
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Detalles de Categoría</CardTitle>
              <CardDescription>Desglose detallado por categoría</CardDescription>
            </div>
            <ExportButton
              data={sortedCategories.map((c) => ({
                'Categoría': c.categoryName,
                'Productos': c.productsCount,
                'Unidades Vendidas': c.quantitySold,
                'Ingresos': c.revenue,
                'Promedio por Producto': c.avgPerProduct,
                '% del Total': c.percentageOfTotal,
              }))}
              filename={`analítica-categorías-${startDate}-a-${endDate}`}
            />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre de Categoría</TableHead>
                    <TableHead className="text-right">Productos</TableHead>
                    <TableHead className="text-right">Unidades Vendidas</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Promedio por Producto</TableHead>
                    <TableHead className="text-right">% del Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCategories.map((category) => (
                    <TableRow key={category.categoryId}>
                      <TableCell className="font-medium">{category.categoryName}</TableCell>
                      <TableCell className="text-right">{category.productsCount}</TableCell>
                      <TableCell className="text-right">{category.quantitySold}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(category.revenue)}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(category.avgPerProduct)}</TableCell>
                      <TableCell className="text-right">
                        <span className="text-primary font-semibold">
                          {formatPercentage(category.percentageOfTotal)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
