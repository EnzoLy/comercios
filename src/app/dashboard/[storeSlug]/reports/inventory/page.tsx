'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/hooks/use-store'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingPage } from '@/components/ui/loading'
import { ArrowLeft, Download, Package, AlertTriangle, TrendingUp, DollarSign, FileText } from 'lucide-react'

export default function InventoryReportPage() {
  const store = useStore()
  const [products, setProducts] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (store) {
      loadData()
    }
  }, [store])

  const loadData = async () => {
    if (!store) return

    setIsLoading(true)
    try {
      const [productsRes, alertsRes] = await Promise.all([
        fetch(`/api/stores/${store.storeId}/products`),
        fetch(`/api/stores/${store.storeId}/inventory/alerts`),
      ])

      if (productsRes.ok) {
        const productsData = await productsRes.json()
        setProducts(productsData)
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json()
        setAlerts(alertsData)
      }
    } catch (error) {
      toast.error('Failed to load inventory data')
      console.error('Load error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const totalProducts = products.length
  const activeProducts = products.filter((p) => p.isActive).length
  const totalValue = products.reduce(
    (sum, p) => sum + Number(p.sellingPrice) * p.currentStock,
    0
  )
  const totalCost = products.reduce(
    (sum, p) => sum + Number(p.costPrice) * p.currentStock,
    0
  )
  const potentialProfit = totalValue - totalCost

  const exportToCSV = () => {
    if (products.length === 0) {
      toast.error('No data to export')
      return
    }

    const headers = ['Name', 'SKU', 'Barcode', 'Current Stock', 'Min Level', 'Cost Price', 'Selling Price', 'Stock Value', 'Status']
    const rows = products.map((product) => [
      product.name,
      product.sku,
      product.barcode || '',
      product.currentStock,
      product.minStockLevel,
      Number(product.costPrice).toFixed(2),
      Number(product.sellingPrice).toFixed(2),
      (Number(product.sellingPrice) * product.currentStock).toFixed(2),
      product.currentStock <= product.minStockLevel ? 'Low Stock' : 'OK',
    ])

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast.success('Report exported successfully')
  }

  if (isLoading) {
    return (
      <LoadingPage
        title="Cargando reporte"
        description="Generando reporte de inventario..."
        icon={<Package className="h-8 w-8 text-gray-600" />}
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
          <h1 className="text-3xl font-bold mb-2">Inventory Report</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Current stock levels and valuation
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Products
            </CardTitle>
            <Package className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-gray-500 mt-1">
              {activeProducts} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Inventory Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">
              Selling price basis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Cost Basis
            </CardTitle>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">
              Total cost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Potential Profit
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${potentialProfit.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">
              If all sold
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Alerts */}
      {alerts && (alerts.summary.lowStockCount > 0 || alerts.summary.outOfStockCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-red-200 bg-red-50 dark:bg-red-950">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-900 dark:text-red-100">
                Out of Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                {alerts.summary.outOfStockCount}
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-100">
                Low Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                {alerts.summary.lowStockCount}
              </div>
            </CardContent>
          </Card>

          <Card style={{ borderColor: 'var(--color-primary)', backgroundColor: 'rgba(var(--color-primary), 0.05)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
                Healthy Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                {totalProducts - alerts.summary.lowStockCount - alerts.summary.outOfStockCount}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Products by Category */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Stock by Category</CardTitle>
          <CardDescription>Product distribution across categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(() => {
              const categoryGroups = products.reduce((acc: any, product) => {
                const categoryName = product.category?.name || 'Uncategorized'
                if (!acc[categoryName]) {
                  acc[categoryName] = { count: 0, value: 0 }
                }
                acc[categoryName].count++
                acc[categoryName].value += Number(product.sellingPrice) * product.currentStock
                return acc
              }, {})

              return Object.entries(categoryGroups).map(([category, data]: [string, any]) => {
                const percentage = ((data.count / totalProducts) * 100).toFixed(1)
                return (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="font-medium min-w-[150px]">{category}</span>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold">{data.count} items</p>
                      <p className="text-xs text-gray-500">${Number(data.value).toFixed(2)}</p>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Products */}
      {alerts?.lowStock && alerts.lowStock.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Low Stock Products
            </CardTitle>
            <CardDescription>Products that need restocking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Product</th>
                    <th className="text-left py-3 px-4">SKU</th>
                    <th className="text-right py-3 px-4">Current</th>
                    <th className="text-right py-3 px-4">Min Level</th>
                    <th className="text-right py-3 px-4">Needed</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.lowStock.map((product: any) => (
                    <tr key={product.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4">
                        <p className="font-medium">{product.name}</p>
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-sm">{product.sku}</code>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-orange-600">
                          {product.currentStock}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {product.minStockLevel}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge variant="outline">
                          +{product.minStockLevel - product.currentStock}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Products */}
      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
          <CardDescription>Complete inventory list</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Product</th>
                  <th className="text-left py-3 px-4">SKU</th>
                  <th className="text-right py-3 px-4">Stock</th>
                  <th className="text-right py-3 px-4">Cost</th>
                  <th className="text-right py-3 px-4">Price</th>
                  <th className="text-right py-3 px-4">Value</th>
                  <th className="text-center py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const stockValue = Number(product.sellingPrice) * product.currentStock
                  const isLowStock = product.currentStock <= product.minStockLevel

                  return (
                    <tr key={product.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4">
                        <p className="font-medium">{product.name}</p>
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-sm">{product.sku}</code>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={isLowStock ? 'text-orange-600 font-semibold' : ''}>
                          {product.currentStock}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        ${Number(product.costPrice).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        ${Number(product.sellingPrice).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        ${stockValue.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {product.currentStock === 0 ? (
                          <Badge variant="destructive">Out</Badge>
                        ) : isLowStock ? (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-900">
                            Low
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-100 text-green-900">
                            OK
                          </Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
