'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useStore } from '@/hooks/use-store'
import { toast } from 'sonner'
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

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ventas por Fecha</h1>
        <p className="text-muted-foreground mt-2">
          Ver tendencias de ventas diarias o mensuales y analizar patrones de ingresos
        </p>
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
            title="Transacciones Totales"
            value={summary.totalTransactions}
            icon="📊"
            format="number"
          />
          <MetricDisplay
            title="Transacción Promedio"
            value={summary.avgTransaction}
            icon="📈"
            format="currency"
          />
        </div>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Datos de Ventas</CardTitle>
              <CardDescription>Desglose detallado por {granularity === 'month' ? 'mes' : granularity === 'week' ? 'semana' : 'día'}</CardDescription>
            </div>
            <ExportButton
              data={tableData}
              filename={`ventas-por-${granularity}-${startDate}-a-${endDate}`}
            />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{granularity === 'month' ? 'Mes' : 'Fecha'}</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Transacciones</TableHead>
                    <TableHead className="text-right">Transacción Promedio</TableHead>
                    <TableHead className="text-right">% del Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((row) => (
                    <TableRow key={row.date}>
                      <TableCell>
                        {granularity === 'month'
                          ? formatMonthDisplay(row.date)
                          : formatDateDisplay(row.date)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.revenue)}
                      </TableCell>
                      <TableCell className="text-right">{row.transactions}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.avgTransaction)}</TableCell>
                      <TableCell className="text-right">{row.percentOfTotal}%</TableCell>
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
