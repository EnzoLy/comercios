'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/hooks/use-store'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton, StatsSkeleton, TableSkeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Download, DollarSign, ShoppingCart, CreditCard, TrendingUp, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SalesReportPage() {
  const store = useStore()
  const [sales, setSales] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    if (store) {
      // Set default date range to last 30 days
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)

      setStartDate(start.toISOString().split('T')[0])
      setEndDate(end.toISOString().split('T')[0])
    }
  }, [store])

  useEffect(() => {
    if (store && startDate && endDate) {
      loadSales()
    }
  }, [store, startDate, endDate])

  const loadSales = async () => {
    if (!store) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        status: 'COMPLETED',
        startDate,
        endDate,
      })

      const response = await fetch(`/api/stores/${store.storeId}/sales?${params}`)
      if (!response.ok) throw new Error('Failed to load sales')

      const data = await response.json()
      setSales(data)
    } catch (error) {
      toast.error('Failed to load sales data')
      console.error('Load sales error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total), 0)
  const totalTransactions = sales.length
  const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

  // Payment method breakdown
  const paymentBreakdown = sales.reduce((acc: any, sale) => {
    acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + Number(sale.total)
    return acc
  }, {})

  // Daily sales
  const dailySales = sales.reduce((acc: any, sale) => {
    const date = new Date(sale.createdAt).toLocaleDateString('es-ES', { timeZone: 'America/Argentina/Buenos_Aires' })
    acc[date] = (acc[date] || 0) + Number(sale.total)
    return acc
  }, {})

  const exportToCSV = () => {
    if (sales.length === 0) {
      toast.error('No data to export')
      return
    }

    const headers = ['Date', 'Time', 'Total', 'Payment Method', 'Items', 'Cashier']
    const rows = sales.map((sale) => [
      new Date(sale.createdAt).toLocaleDateString('es-ES', { timeZone: 'America/Argentina/Buenos_Aires' }),
      new Date(sale.createdAt).toLocaleTimeString('es-ES', { timeZone: 'America/Argentina/Buenos_Aires' }),
      Number(sale.total).toFixed(2),
      sale.paymentMethod,
      sale.items?.length || 0,
      sale.cashier?.name || 'Unknown',
    ])

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-report-${startDate}-to-${endDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast.success('Report exported successfully')
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <StatsSkeleton />
        <TableSkeleton />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dashboard/${store?.slug}/reports`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reports
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Sales Report</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Analyze sales performance and trends
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
          <CardDescription>Select the period for the report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={loadSales} className="w-full">
                Apply Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">
              {startDate} to {endDate}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Transactions
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-gray-500 mt-1">
              Total sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Average Sale
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${averageTransaction.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">
              Per transaction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Daily Average
            </CardTitle>
            <CreditCard className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Object.keys(dailySales).length > 0 ? (totalRevenue / Object.keys(dailySales).length).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Revenue per day
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Method Breakdown */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Payment Method Breakdown</CardTitle>
          <CardDescription>Revenue by payment type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(paymentBreakdown).map(([method, amount]: [string, any]) => {
              const percentage = ((amount / totalRevenue) * 100).toFixed(1)
              return (
                <div key={method} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Badge variant="outline">{method}</Badge>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold">${Number(amount).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{percentage}%</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Daily Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Sales</CardTitle>
          <CardDescription>Revenue breakdown by day</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(dailySales).length === 0 ? (
            <p className="text-center text-gray-500 py-8">No sales in selected period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-right py-3 px-4">Revenue</th>
                    <th className="text-right py-3 px-4">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(dailySales)
                    .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
                    .map(([date, amount]: [string, any]) => {
                      const percentage = ((amount / totalRevenue) * 100).toFixed(1)
                      return (
                        <tr key={date} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="py-3 px-4">{date}</td>
                          <td className="py-3 px-4 text-right font-semibold">
                            ${Number(amount).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-600">
                            {percentage}%
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
