'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/hooks/use-store'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StockAdjustmentDialog } from '@/components/inventory/stock-adjustment-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingPage } from '@/components/ui/loading'
import { AlertTriangle, TrendingUp, TrendingDown, Package, Plus } from 'lucide-react'

export default function InventoryPage() {
  const store = useStore()
  const [alerts, setAlerts] = useState<any>(null)
  const [movements, setMovements] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [adjustmentOpen, setAdjustmentOpen] = useState(false)

  useEffect(() => {
    if (store) {
      loadData()
    }
  }, [store])

  const loadData = async () => {
    if (!store) return

    setIsLoading(true)
    try {
      const [alertsRes, movementsRes, productsRes] = await Promise.all([
        fetch(`/api/stores/${store.storeId}/inventory/alerts`),
        fetch(`/api/stores/${store.storeId}/inventory/movements?limit=30`),
        fetch(`/api/stores/${store.storeId}/products`),
      ])

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json()
        setAlerts(alertsData)
      }

      if (movementsRes.ok) {
        const movementsData = await movementsRes.json()
        setMovements(movementsData)
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json()
        setProducts(productsData)
      }
    } catch (error) {
      toast.error('Error al cargar datos de inventario')
      console.error('Load error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE':
      case 'RETURN':
      case 'ADJUSTMENT':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'SALE':
      case 'DAMAGE':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  const getMovementColor = (quantity: number) => {
    return quantity > 0 ? 'text-green-600' : 'text-red-600'
  }

  if (isLoading) {
    return (
      <LoadingPage
        title="Cargando inventario"
        description="Obteniendo información de stock y movimientos..."
        icon={<Package className="h-8 w-8 text-gray-600" />}
      />
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Inventario</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Administra los niveles de stock y rastrea movimientos
          </p>
        </div>
        <Button onClick={() => setAdjustmentOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Ajustar Stock
        </Button>
      </div>

      {/* Stock Alerts */}
      {alerts && (alerts.summary.lowStockCount > 0 || alerts.summary.outOfStockCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-red-200 bg-red-50 dark:bg-red-950">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-900 dark:text-red-100">
                Sin Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                {alerts.summary.outOfStockCount}
              </div>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                Productos con 0 stock
              </p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-100">
                Stock Bajo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                {alerts.summary.lowStockCount}
              </div>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                Bajo el nivel mínimo
              </p>
            </CardContent>
          </Card>

          {alerts.summary.highStockCount > 0 && (
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Stock Alto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {alerts.summary.highStockCount}
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Sobre el nivel máximo
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Tabs defaultValue="movements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="movements">Movimientos Recientes</TabsTrigger>
          <TabsTrigger value="alerts">Alertas de Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Movimientos de Stock Recientes</CardTitle>
              <CardDescription>Últimas 30 transacciones de stock</CardDescription>
            </CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Aún no hay movimientos</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Fecha</th>
                        <th className="text-left py-3 px-4">Producto</th>
                        <th className="text-left py-3 px-4">Tipo</th>
                        <th className="text-right py-3 px-4">Cantidad</th>
                        <th className="text-left py-3 px-4">Notas</th>
                        <th className="text-left py-3 px-4">Usuario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((movement) => (
                        <tr key={movement.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="py-3 px-4">
                            <div className="text-sm">
                              {new Date(movement.createdAt).toLocaleDateString()}
                              <br />
                              <span className="text-xs text-gray-500">
                                {new Date(movement.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{movement.product?.name}</p>
                              <p className="text-sm text-gray-500">{movement.product?.sku}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {getMovementIcon(movement.type)}
                              <Badge variant="outline">{movement.type}</Badge>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`font-semibold ${getMovementColor(movement.quantity)}`}>
                              {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-600">
                              {movement.notes || movement.reference || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm">
                              {movement.user?.name || 'Sistema'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {alerts?.outOfStock && alerts.outOfStock.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-100">
                  <AlertTriangle className="h-5 w-5" />
                  Sin Stock ({alerts.outOfStock.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {alerts.outOfStock.map((product: any) => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-600">{product.sku}</p>
                      </div>
                      <Badge variant="destructive">0 en stock</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {alerts?.lowStock && alerts.lowStock.length > 0 && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
                  <AlertTriangle className="h-5 w-5" />
                  Stock Bajo ({alerts.lowStock.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {alerts.lowStock.map((product: any) => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-600">{product.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-orange-900 dark:text-orange-100">
                          {product.currentStock} / {product.minStockLevel}
                        </p>
                        <p className="text-xs text-gray-600">Actual / Mín</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(!alerts || (alerts.outOfStock.length === 0 && alerts.lowStock.length === 0)) && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Package className="h-16 w-16 text-green-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-green-900 dark:text-green-100">
                  ¡Todos los niveles de stock están saludables!
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  No hay productos bajo los niveles mínimos de stock
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <StockAdjustmentDialog
        isOpen={adjustmentOpen}
        onClose={() => {
          setAdjustmentOpen(false)
          loadData()
        }}
        products={products}
      />
    </div>
  )
}
