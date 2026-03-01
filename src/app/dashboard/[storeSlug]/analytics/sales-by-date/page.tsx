'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useStore } from '@/hooks/use-store'
import { toast } from 'sonner'
import { TrendingUp, TrendingDown, AlertTriangle, Target, Flame, Snowflake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DateRangeSelector } from '@/components/analytics/shared/DateRangeSelector'
import { MetricDisplay } from '@/components/analytics/shared/MetricDisplay'
import { TimeSeriesChart } from '@/components/analytics/charts/TimeSeriesChart'
import { ExportButton } from '@/components/analytics/shared/ExportButton'
import { LoadingState } from '@/components/analytics/shared/LoadingState'
import { EmptyState } from '@/components/analytics/shared/EmptyState'
import { formatCurrency, formatNumber, formatDateDisplay, formatMonthDisplay } from '@/lib/analytics/chart-utils'

interface SalesData {
  date: string
  revenue: string
  transactions: number
  avgTransaction: string
}

interface SalesSummary {
  totalRevenue: string
  totalTransactions: number
  avgTransaction: string
}

export default function SalesByDatePage() {
  const params = useParams()
  const storeSlug = params.storeSlug as string
  const store = useStore()

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day')
  const [isLoading, setIsLoading] = useState(false)
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [summary, setSummary] = useState<SalesSummary | null>(null)

  // Initialize date range (last 30 days)
  useEffect(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    setEndDate(now.toISOString().split('T')[0])
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0])
  }, [])

  // Fetch sales data
  useEffect(() => {
    if (!startDate || !endDate || !store) return

    const fetchSalesData = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/stores/${store.storeId}/analytics/sales-by-date?startDate=${startDate}&endDate=${endDate}&granularity=${granularity}`
        )

        if (!response.ok) {
          const errorData = await response.json()
          console.error('API Error:', errorData)
          throw new Error(errorData.error || 'Failed to fetch sales data')
        }

        const result = await response.json()
        setSalesData(result.data)
        setSummary(result.summary)
      } catch (error) {
        console.error('Error fetching sales data:', error)
        const errorMsg = error instanceof Error ? error.message : 'Failed to load sales data'
        toast.error(errorMsg)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSalesData()
  }, [startDate, endDate, granularity, store])

  const handleDateChange = (newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate)
    setEndDate(newEndDate)
  }

  const chartData = salesData.map((d) => ({
    date: granularity === 'month' ? formatMonthDisplay(d.date) : formatDateDisplay(d.date),
    revenue: parseFloat(d.revenue),
    transactions: d.transactions,
  }))

  // Calculate percentage of total for each row
  const totalRevenue = summary ? parseFloat(summary.totalRevenue) : 0
  const tableData = salesData.map((d) => ({
    ...d,
    percentOfTotal: totalRevenue > 0 ? ((parseFloat(d.revenue) / totalRevenue) * 100).toFixed(2) : '0.00',
  }))

  // Calculate statistics
  const revenues = salesData.map(d => parseFloat(d.revenue))
  const avgRevenue = salesData.length > 0 ? revenues.reduce((a, b) => a + b, 0) / salesData.length : 0
  const bestDay = salesData.length > 0 ? salesData.reduce((max, d) => parseFloat(d.revenue) > parseFloat(max.revenue) ? d : max) : null
  const worstDay = salesData.length > 0 ? salesData.reduce((min, d) => parseFloat(d.revenue) < parseFloat(min.revenue) ? d : min) : null

  // Calculate volatility (standard deviation)
  const variance = salesData.length > 0
    ? revenues.reduce((sum: number, r: number) => sum + Math.pow(r - avgRevenue, 2), 0) / salesData.length
    : 0
  const stdDev = Math.sqrt(variance)

  // Detect patterns
  const highPerformanceDays = salesData.filter(d => parseFloat(d.revenue) > avgRevenue * 1.2).length
  const lowPerformanceDays = salesData.filter(d => parseFloat(d.revenue) < avgRevenue * 0.8).length

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Tendencias de Ventas</h1>
          <p className="text-muted-foreground mt-2">
            Análisis temporal de ingresos, transacciones y patrones de desempeño
          </p>
        </div>
      </div>

      {/* Date Range Selector */}
      <DateRangeSelector startDate={startDate} endDate={endDate} onDateChange={handleDateChange} />

      {/* Granularity Toggle */}
      <Card style={{ borderColor: 'var(--color-primary)' }}>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <p className="text-sm font-medium mr-4 self-center">Granularidad:</p>
            <Button
              variant={granularity === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGranularity('day')}
              style={granularity === 'day' ? { backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)' } : {}}
            >
              Diario
            </Button>
            <Button
              variant={granularity === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGranularity('week')}
              style={granularity === 'week' ? { backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)' } : {}}
            >
              Semanal
            </Button>
            <Button
              variant={granularity === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGranularity('month')}
              style={granularity === 'month' ? { backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)' } : {}}
            >
              Mensual
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alert Section - Critical Patterns */}
      {!isLoading && salesData.length > 0 && (
        <div className="space-y-3">
          {worstDay && parseFloat(worstDay.revenue) < avgRevenue * 0.7 && (
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-orange-900 dark:text-orange-100">⚠️ Patrón detectado</p>
                    <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                      Caída significativa de ingresos. El {granularity === 'month' ? 'mes' : 'día'} con menor desempeño tuvo {formatCurrency(worstDay.revenue)} ({formatNumber((parseFloat(worstDay.revenue) / avgRevenue * 100).toFixed(0))}% del promedio)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Summary Metrics - Expanded */}
      {isLoading ? (
        <LoadingState type="card" count={7} />
      ) : !summary ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            <MetricDisplay
              title="Ingresos Totales"
              value={summary.totalRevenue}
              icon="💰"
              format="currency"
            />
            <MetricDisplay
              title="Transacciones"
              value={summary.totalTransactions}
              icon="📊"
              format="number"
            />
            <MetricDisplay
              title="Transacción Promedio"
              value={summary.avgTransaction}
              icon="💵"
              format="currency"
            />
            <MetricDisplay
              title="Promedio Diario"
              value={avgRevenue.toFixed(2)}
              icon="📈"
              format="currency"
            />
            <MetricDisplay
              title="Mejor Día"
              value={bestDay?.revenue || '0'}
              icon="🔥"
              format="currency"
            />
            <MetricDisplay
              title="Peor Día"
              value={worstDay?.revenue || '0'}
              icon="❄️"
              format="currency"
            />
            <MetricDisplay
              title="Volatilidad (σ)"
              value={stdDev.toFixed(2)}
              icon="📉"
              format="currency"
            />
          </div>

          {/* Performance Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">
                  🔥 Días Excepcionales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{highPerformanceDays}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {((highPerformanceDays / salesData.length) * 100).toFixed(0)}% de los {granularity === 'month' ? 'meses' : 'días'} superaron el promedio
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">
                  ❄️ Días Bajos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-orange-600">{lowPerformanceDays}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {((lowPerformanceDays / salesData.length) * 100).toFixed(0)}% de los {granularity === 'month' ? 'meses' : 'días'} estuvieron bajo el promedio
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Chart */}
      {isLoading ? (
        <LoadingState type="chart" />
      ) : chartData.length === 0 ? (
        <EmptyState />
      ) : (
        <Card style={{ borderColor: 'var(--color-secondary)' }}>
          <CardHeader>
            <CardTitle>Tendencia de Ingresos</CardTitle>
            <CardDescription>Ingresos y cantidad de transacciones a lo largo del tiempo</CardDescription>
          </CardHeader>
          <CardContent>
            <TimeSeriesChart
              data={chartData}
              seriesConfig={[
                {
                  key: 'revenue',
                  name: 'Ingresos',
                  color: '#3b82f6',
                  yAxis: 'left',
                },
                {
                  key: 'transactions',
                  name: 'Transacciones',
                  color: '#8b5cf6',
                  yAxis: 'right',
                },
              ]}
              height={400}
            />
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      {isLoading ? (
        <LoadingState type="table" />
      ) : tableData.length === 0 ? (
        <EmptyState />
      ) : (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Análisis Temporal Detallado</CardTitle>
              <CardDescription>
                {tableData.length} {granularity === 'month' ? 'meses' : granularity === 'week' ? 'semanas' : 'días'} analizados
              </CardDescription>
            </div>
            <ExportButton
              data={tableData}
              filename={`ventas-${granularity}-${startDate}-a-${endDate}`}
            />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{granularity === 'month' ? 'Mes' : 'Fecha'}</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Transacciones</TableHead>
                    <TableHead className="text-right">Promedio</TableHead>
                    <TableHead className="text-right">% del Total</TableHead>
                    <TableHead className="text-center">Tendencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((row, idx) => {
                    const rowRevenue = parseFloat(row.revenue)
                    const isAboveAvg = rowRevenue > avgRevenue
                    const isHighPerformance = rowRevenue > avgRevenue * 1.2
                    const isLowPerformance = rowRevenue < avgRevenue * 0.8
                    const percentage = parseFloat(row.percentOfTotal)

                    return (
                      <TableRow
                        key={row.date}
                        className={idx % 2 === 0 ? 'bg-muted/20' : ''}
                      >
                        <TableCell className="font-medium">
                          {granularity === 'month'
                            ? formatMonthDisplay(row.date)
                            : formatDateDisplay(row.date)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          <span className={isHighPerformance ? 'text-green-600' : isLowPerformance ? 'text-orange-600' : ''}>
                            {formatCurrency(row.revenue)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {row.transactions}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(row.avgTransaction)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                              <div
                                className="h-2 rounded-full transition-all"
                                style={{
                                  width: `${Math.min(percentage, 100)}%`,
                                  backgroundColor: isHighPerformance ? '#10b981' : isLowPerformance ? '#f97316' : 'var(--color-primary)',
                                }}
                              />
                            </div>
                            <span className="font-semibold min-w-[45px] text-right">
                              {row.percentOfTotal}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {isHighPerformance && <Flame className="h-4 w-4 text-green-600 mx-auto" />}
                          {isLowPerformance && <Snowflake className="h-4 w-4 text-orange-600 mx-auto" />}
                          {!isHighPerformance && !isLowPerformance && <TrendingUp className="h-4 w-4 text-muted-foreground mx-auto" />}
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
