'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useStore } from '@/hooks/use-store'
import { toast } from 'sonner'
import { Trophy, Zap, TrendingUp, TrendingDown, AlertCircle, Award, BarChart3 } from 'lucide-react'
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
  const [sortBy, setSortBy] = useState<'revenue' | 'transactions'>('transactions')

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
    transactions: e.transactions,
  }))

  // Calculate KPIs
  const avgRevenuePerEmployee = summary && employees.length > 0 ? parseFloat(summary.totalRevenue) / employees.length : 0
  const avgTransactionsPerEmployee = summary && employees.length > 0 ? summary.totalTransactions / employees.length : 0
  const topEmployee = sortedEmployees.length > 0 ? sortedEmployees[0] : null
  const lowestEmployee = sortedEmployees.length > 0 ? sortedEmployees[sortedEmployees.length - 1] : null

  // Employees below average
  const aboveAvgCount = employees.filter(e => parseFloat(e.revenue) > avgRevenuePerEmployee).length
  const belowAvgCount = employees.length - aboveAvgCount

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Desempeño de Empleados</h1>
          <p className="text-muted-foreground mt-2">
            Análisis detallado de métricas de ventas, consistencia y desempeño de equipo
          </p>
        </div>
      </div>

      {/* Date Range Selector */}
      <DateRangeSelector startDate={startDate} endDate={endDate} onDateChange={handleDateChange} />

      {/* Main Summary Metrics - Expanded */}
      {isLoading ? (
        <LoadingState type="card" count={8} />
      ) : !summary ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-4">
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
              title="Empleados Activos"
              value={employees.length}
              icon="👥"
              format="number"
            />
            <MetricDisplay
              title="Ingreso Promedio/Empleado"
              value={avgRevenuePerEmployee.toFixed(2)}
              icon="📈"
              format="currency"
            />
            <MetricDisplay
              title="Transacciones Promedio"
              value={Math.round(avgTransactionsPerEmployee)}
              icon="🎯"
              format="number"
            />
            <MetricDisplay
              title="Arriba del Promedio"
              value={aboveAvgCount}
              icon="⬆️"
              format="number"
            />
            <MetricDisplay
              title="Bajo del Promedio"
              value={belowAvgCount}
              icon="⬇️"
              format="number"
            />
          </div>

          {/* Top Performers - Improved */}
          {topPerformers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topPerformers.map((employee, idx) => {
                const medals = ['🥇', '🥈', '🥉']
                return (
                  <Card
                    key={employee.employeeId}
                    className={`border-l-4 ${idx === 0 ? 'border-l-yellow-500' : idx === 1 ? 'border-l-gray-400' : 'border-l-orange-400'}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {medals[idx]} {idx === 0 ? 'Mejor Desempeño' : idx === 1 ? 'Segundo Lugar' : 'Tercer Lugar'}
                          </p>
                          <p className="text-lg font-bold mt-2">{employee.employeeName}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-2xl font-bold">{formatCurrency(employee.revenue)}</p>
                        <p className="text-xs text-muted-foreground">En ingresos</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Transacciones</p>
                          <p className="font-semibold">{employee.transactions}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Promedio</p>
                          <p className="font-semibold">{formatCurrency(employee.avgTransaction)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Chart */}
      {isLoading ? (
        <LoadingState type="chart" />
      ) : chartData.length === 0 ? (
        <EmptyState />
      ) : (
        <Card style={{ borderColor: 'var(--color-accent)' }}>
          <CardHeader>
            <CardTitle>Transacciones por Empleado</CardTitle>
            <CardDescription>Número total de ventas realizadas por cada cajero</CardDescription>
          </CardHeader>
          <CardContent>
            <BarComparisonChart
              data={chartData}
              dataKey="transactions"
              nameKey="name"
              color="#3b82f6"
              layout="vertical"
              height={Math.max(300, employees.length * 40)}
              formatValue={(value) => formatNumber(value)}
            />
          </CardContent>
        </Card>
      )}

      {/* Performance Alerts */}
      {!isLoading && lowestEmployee && parseFloat(lowestEmployee.revenue) < avgRevenuePerEmployee * 0.5 && (
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-900 dark:text-orange-100">⚠️ Desempeño bajo detectado</p>
                <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                  {lowestEmployee.employeeName} está significativamente por debajo del promedio ({formatCurrency(lowestEmployee.revenue)} vs {formatCurrency(avgRevenuePerEmployee.toString())})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Data Table */}
      {isLoading ? (
        <LoadingState type="table" />
      ) : employees.length === 0 ? (
        <EmptyState />
      ) : (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Análisis Detallado de Empleados</CardTitle>
              <CardDescription>
                {sortedEmployees.length} empleados — Ordenado por ingresos
              </CardDescription>
            </div>
            <ExportButton
              data={sortedEmployees.map((e) => ({
                'Empleado': e.employeeName,
                'Transacciones': e.transactions,
                'Ingresos': e.revenue,
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
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-1/3">Empleado</TableHead>
                    <TableHead className="text-right">Transacciones</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Promedio</TableHead>
                    <TableHead className="text-right">% del Total</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEmployees.map((employee, idx) => {
                    const revenueNum = parseFloat(employee.revenue)
                    const isAboveAvg = revenueNum > avgRevenuePerEmployee
                    const isTopPerformer = idx < 3
                    const percentOfTotal = summary ? ((revenueNum / parseFloat(summary.totalRevenue)) * 100) : 0

                    return (
                      <TableRow key={employee.employeeId} className={idx % 2 === 0 ? 'bg-muted/20' : ''}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {idx === 0 && <span>🥇</span>}
                            {idx === 1 && <span>🥈</span>}
                            {idx === 2 && <span>🥉</span>}
                            {employee.employeeName}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {employee.transactions}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          <span className={isAboveAvg ? 'text-green-600' : 'text-orange-600'}>
                            {formatCurrency(employee.revenue)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(employee.avgTransaction)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                              <div
                                className="h-2 rounded-full transition-all"
                                style={{
                                  width: `${Math.min(percentOfTotal, 100)}%`,
                                  backgroundColor: isTopPerformer ? '#10b981' : isAboveAvg ? 'var(--color-primary)' : '#f97316',
                                }}
                              />
                            </div>
                            <span className="font-semibold min-w-[40px] text-right text-xs">
                              {percentOfTotal.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {isAboveAvg ? (
                            <TrendingUp className="h-4 w-4 text-green-600 mx-auto" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-orange-600 mx-auto" />
                          )}
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
