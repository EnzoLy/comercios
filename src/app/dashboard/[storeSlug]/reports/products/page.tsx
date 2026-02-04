'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/hooks/use-store'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingPage } from '@/components/ui/loading'
import { ArrowLeft, Download, TrendingUp, Package, DollarSign, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ProductPerformancePage() {
  const store = useStore()
  const [sales, setSales] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [days, setDays] = useState('30')

  useEffect(() => {
    if (store) {
      loadData()
    }
  }, [store, days])

  const loadData = async () => {
    if (!store) return

    setIsLoading(true)
    try {
      const daysAgo = new Date()
      daysAgo.setDate(daysAgo.getDate() - parseInt(days))

      const params = new URLSearchParams({
        status: 'COMPLETED',
        startDate: daysAgo.toISOString(),
      })

      const [salesRes, productsRes] = await Promise.all([
        fetch(`/api/stores/${store.storeId}/sales?${params}`),
        fetch(`/api/stores/${store.storeId}/products`),
      ])

      if (salesRes.ok) {
        const salesData = await salesRes.json()
        setSales(salesData)
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json()
        setProducts(productsData)
      }
    } catch (error) {
      toast.error('Failed to load data')
      console.error('Load error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate product performance
  const productPerformance = sales.reduce((acc: any, sale) => {
    sale.items?.forEach((item: any) => {
      if (!acc[item.productId]) {
        acc[item.productId] = {
          productId: item.productId,
          name: item.productName,
          sku: item.productSku,
          quantitySold: 0,
          revenue: 0,
          transactions: 0,
        }
      }

      acc[item.productId].quantitySold += item.quantity
      acc[item.productId].revenue += Number(item.total)
      acc[item.productId].transactions++
    })

    return acc
  }, {})

  const performanceList = Object.values(productPerformance)
    .sort((a: any, b: any) => b.quantitySold - a.quantitySold)

  const totalRevenue = performanceList.reduce((sum: number, p: any) => sum + p.revenue, 0)
  const totalQuantity = performanceList.reduce((sum: number, p: any) => sum + p.quantitySold, 0)

  // Products with no sales
  const productIds = new Set(performanceList.map((p: any) => p.productId))
  const noSales = products.filter((p) => !productIds.has(p.id) && p.isActive)

  const exportToCSV = () => {
    if (performanceList.length === 0) {
      toast.error('No data to export')
      return
    }

    const headers = ['Rank', 'Product', 'SKU', 'Quantity Sold', 'Revenue', 'Transactions', 'Avg per Transaction']
    const rows = performanceList.map((product: any, index) => [
      index + 1,
      product.name,
      product.sku,
      product.quantitySold,
      product.revenue.toFixed(2),
      product.transactions,
      (product.revenue / product.transactions).toFixed(2),
    ])

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `product-performance-${days}-days.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast.success('Report exported successfully')
  }

  if (isLoading) {
    return (
      <LoadingPage
        title="Cargando reporte"
        description="Generando reporte de productos..."
        icon={<FileText className="h-8 w-8 text-gray-600" />}
      />
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
          <h1 className="text-3xl font-bold mb-2">Product Performance</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Analyze best-selling products and trends
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline" disabled={performanceList.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Time Range Filter */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Time Period</CardTitle>
          <CardDescription>Select analysis period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {['7', '30', '60', '90'].map((d) => (
              <Button
                key={d}
                variant={days === d ? 'default' : 'outline'}
                onClick={() => setDays(d)}
              >
                Last {d} days
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Products Sold
            </CardTitle>
            <Package className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceList.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              Different products
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Units
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuantity}</div>
            <p className="text-xs text-gray-500 mt-1">
              Units sold
            </p>
          </CardContent>
        </Card>

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
              Last {days} days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top 10 Products */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Top 10 Best Sellers</CardTitle>
          <CardDescription>Productos ordenados por cantidad vendida</CardDescription>
        </CardHeader>
        <CardContent>
          {performanceList.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No sales data available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Rank</th>
                    <th className="text-left py-3 px-4">Product</th>
                    <th className="text-right py-3 px-4">Qty Sold</th>
                    <th className="text-right py-3 px-4">Revenue</th>
                    <th className="text-right py-3 px-4">% of Total</th>
                    <th className="text-right py-3 px-4">Avg/Sale</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceList.slice(0, 10).map((product: any, index) => {
                    const percentage = ((product.revenue / totalRevenue) * 100).toFixed(1)
                    const avgPerSale = product.revenue / product.transactions

                    return (
                      <tr key={product.productId} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-3 px-4">
                          <Badge variant={index === 0 ? 'default' : 'outline'}>
                            #{index + 1}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-gray-500">{product.sku}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {product.quantitySold}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-green-600">
                          ${product.revenue.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          {percentage}%
                        </td>
                        <td className="py-3 px-4 text-right">
                          ${avgPerSale.toFixed(2)}
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

      {/* Products with No Sales */}
      {noSales.length > 0 && (
        <Card style={{ borderColor: 'var(--color-accent)' }}>
          <CardHeader>
            <CardTitle>Products with No Sales</CardTitle>
            <CardDescription>{noSales.length} products haven&apos;t sold in the last {days} days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {noSales.slice(0, 12).map((product) => (
                <div key={product.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.sku}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Stock: {product.currentStock}
                  </p>
                </div>
              ))}
            </div>
            {noSales.length > 12 && (
              <p className="text-sm text-gray-500 mt-4 text-center">
                And {noSales.length - 12} more...
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
