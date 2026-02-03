'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/hooks/use-store'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingPage } from '@/components/ui/loading'
import { AlertTriangle, TrendingUp, TrendingDown, Package, Search, Loader2 } from 'lucide-react'

export default function InventoryPage() {
  const router = useRouter()
  const store = useStore()
  const [alerts, setAlerts] = useState<any>(null)
  const [movements, setMovements] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [adjustmentData, setAdjustmentData] = useState<Record<string, { quantity: string; notes: string }>>({})
  const [savingProductId, setSavingProductId] = useState<string | null>(null)

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

  const updateAdjustmentData = (productId: string, field: 'quantity' | 'notes', value: string) => {
    setAdjustmentData((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || { quantity: '', notes: '' }),
        [field]: value,
      },
    }))
  }

  const saveAdjustment = async (productId: string) => {
    if (!store) return

    const data = adjustmentData[productId]
    if (!data || !data.quantity || !data.notes.trim()) {
      toast.error('Por favor completa cantidad y notas')
      return
    }

    const quantity = Number(data.quantity)
    if (isNaN(quantity) || quantity === 0) {
      toast.error('La cantidad debe ser un número diferente de 0')
      return
    }

    setSavingProductId(productId)

    try {
      const response = await fetch(`/api/stores/${store.storeId}/inventory/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          type: 'ADJUSTMENT',
          quantity,
          notes: data.notes,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Error al ajustar el stock')
        return
      }

      toast.success('¡Stock ajustado exitosamente!')
      setAdjustmentData((prev) => {
        const newData = { ...prev }
        delete newData[productId]
        return newData
      })
      loadData()
    } catch (error) {
      toast.error('Error al guardar el ajuste')
      console.error('Adjustment error:', error)
    } finally {
      setSavingProductId(null)
    }
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Inventario</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Administra los niveles de stock y rastrea movimientos
        </p>
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
          <TabsTrigger value="adjust">Ajustar Stock</TabsTrigger>
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

        <TabsContent value="adjust" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ajustar Stock</CardTitle>
              <CardDescription>
                Ajusta manualmente los niveles de stock. Usa números positivos para agregar, negativos para restar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre o SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Products Table */}
              {filteredProducts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {searchTerm ? 'No se encontraron productos' : 'Cargando productos...'}
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                        {/* Product Info */}
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-600">{product.sku}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Stock actual: <span className="font-semibold">{product.currentStock}</span>
                          </p>
                        </div>

                        {/* Quantity Input */}
                        <div>
                          <label className="text-sm font-medium block mb-1">Cantidad</label>
                          <Input
                            type="number"
                            placeholder="Ej: +10 o -5"
                            value={adjustmentData[product.id]?.quantity ?? ''}
                            onChange={(e) => updateAdjustmentData(product.id, 'quantity', e.target.value)}
                            disabled={savingProductId === product.id}
                          />
                        </div>

                        {/* Notes Input */}
                        <div>
                          <label className="text-sm font-medium block mb-1">Razón</label>
                          <Input
                            type="text"
                            placeholder="Ej: Recount, damage..."
                            value={adjustmentData[product.id]?.notes ?? ''}
                            onChange={(e) => updateAdjustmentData(product.id, 'notes', e.target.value)}
                            disabled={savingProductId === product.id}
                          />
                        </div>

                        {/* Save Button */}
                        <div className="flex items-end">
                          <Button
                            onClick={() => saveAdjustment(product.id)}
                            disabled={savingProductId === product.id || !adjustmentData[product.id]}
                            className="w-full"
                            size="sm"
                          >
                            {savingProductId === product.id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Guardando...
                              </>
                            ) : (
                              'Guardar'
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
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
    </div>
  )
}
