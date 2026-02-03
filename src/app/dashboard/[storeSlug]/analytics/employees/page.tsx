'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useStore } from '@/hooks/use-store'
import { toast } from 'sonner'
import { Trophy, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DateRangeSelector } from '@/components/analytics/shared/DateRangeSelector'
import { MetricDisplay } from '@/components/analytics/shared/MetricDisplay'
import { BarComparisonChart } from '@/components/analytics/charts/BarComparisonChart'
import { ExportButton } from '@/components/analytics/shared/ExportButton'
import { LoadingState } from '@/components/analytics/shared/LoadingState'
import { EmptyState } from '@/components/analytics/shared/EmptyState'
import { formatCurrency, formatNumber, formatDateDisplay } from '@/lib/analytics/chart-utils'

interface EmployeePerformance {
  employeeId: string
  employeeName: string
  transactions: number
  revenue: string
  avgTransaction: string
  lastSaleDate: string | null
}

interface EmployeeSummary {
  totalRevenue: string
  totalTransactions: number
  avgTransaction: string
}

export default function EmployeesPage() {
  const params = useParams()
  const storeSlug = params.storeSlug as string
  const store = useStore()

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [employees, setEmployees] = useState<EmployeePerformance[]>([])
  const [summary, setSummary] = useState<EmployeeSummary | null>(null)
  const [sortBy, setSortBy] = useState<'revenue' | 'transactions'>('revenue')

  // Initialize date range (last 30 days)
  useEffect(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    setEndDate(now.toISOString().split('T')[0])
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0])
  }, [])

  // Fetch employee performance data
  useEffect(() => {
    if (!startDate || !endDate || !store) return

    const fetchEmployeeData = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/stores/${store.storeId}/analytics/sales-by-employee?startDate=${startDate}&endDate=${endDate}`
        )

        if (!response.ok) {
          const errorData = await response.json()
          console.error('API Error:', errorData)
          throw new Error(errorData.error || 'Failed to fetch employee data')
        }

        const result = await response.json()
        setEmployees(result.data)
        setSummary(result.summary)
      } catch (error) {
        console.error('Error fetching employee data:', error)
        const errorMsg = error instanceof Error ? error.message : 'Failed to load employee data'
        toast.error(errorMsg)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEmployeeData()
  }, [startDate, endDate, store])

  const handleDateChange = (newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate)
    setEndDate(newEndDate)
  }

  // Sort employees
  const sortedEmployees = [...employees].sort((a, b) => {
    if (sortBy === 'revenue') {
      return parseFloat(b.revenue) - parseFloat(a.revenue)
    }
    return b.transactions - a.transactions
  })

  // Get top 3 performers for display
  const topPerformers = sortedEmployees.slice(0, 3)

  const chartData = sortedEmployees.map((e) => ({
    name: e.employeeName,
    revenue: parseFloat(e.revenue),
  }))

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Desempeño de Empleados</h1>
        <p className="text-muted-foreground mt-2">
          Seguimiento de métricas de ventas y desempeño de cajeros/empleados
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

      {/* Top Performers */}
      {!isLoading && topPerformers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topPerformers.map((employee, idx) => (
            <Card
              key={employee.employeeId}
              className={idx === 0 ? 'md:col-span-2' : ''}
              style={{ borderColor: idx === 0 ? 'var(--color-primary)' : 'var(--color-secondary)' }}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {idx === 0 ? '🏆 Mejor Desempeño' : idx === 1 ? '🥈 Segundo Lugar' : '🥉 Tercer Lugar'}
                    </p>
                    <p className="text-xl font-bold mt-2">{employee.employeeName}</p>
                    <div className="mt-4 space-y-1 text-sm">
                      <p>Ingresos: {formatCurrency(employee.revenue)}</p>
                      <p>Transacciones: {employee.transactions}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chart */}
      {isLoading ? (
        <LoadingState type="chart" />
      ) : chartData.length === 0 ? (
        <EmptyState />
      ) : (
        <Card style={{ borderColor: 'var(--color-accent)' }}>
          <CardHeader>
            <CardTitle>Ingresos por Empleado</CardTitle>
            <CardDescription>Ingresos totales generados por cada cajero</CardDescription>
          </CardHeader>
          <CardContent>
            <BarComparisonChart
              data={chartData}
              dataKey="revenue"
              nameKey="name"
              color="#3b82f6"
              layout="vertical"
              height={Math.max(300, employees.length * 40)}
              formatValue={(value) => formatCurrency(value)}
            />
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      {isLoading ? (
        <LoadingState type="table" />
      ) : employees.length === 0 ? (
        <EmptyState />
      ) : (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Detalles del Empleado</CardTitle>
              <CardDescription>Métricas de desempeño completas para cada empleado</CardDescription>
            </div>
            <ExportButton
              data={sortedEmployees.map((e) => ({
                'Nombre del Empleado': e.employeeName,
                'Transacciones': e.transactions,
                'Ingresos Totales': e.revenue,
                'Transacción Promedio': e.avgTransaction,
                'Última Venta': e.lastSaleDate ? formatDateDisplay(e.lastSaleDate) : 'N/A',
              }))}
              filename={`desempeño-empleados-${startDate}-a-${endDate}`}
            />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre del Empleado</TableHead>
                    <TableHead className="text-right">Transacciones</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Transacción Promedio</TableHead>
                    <TableHead>Última Venta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEmployees.map((employee, idx) => (
                    <TableRow key={employee.employeeId}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {idx === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                          {idx === 1 && <Zap className="h-4 w-4 text-blue-500" />}
                          {employee.employeeName}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{employee.transactions}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(employee.revenue)}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(employee.avgTransaction)}</TableCell>
                      <TableCell>
                        {employee.lastSaleDate ? formatDateDisplay(employee.lastSaleDate) : 'N/A'}
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
