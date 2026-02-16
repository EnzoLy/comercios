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
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Package,
  Search,
  Loader2,
  Calendar,
  History,
  Settings2,
  Bell,
  Box,
  FileText,
  Plus,
  Minus,
  CheckCircle2
} from 'lucide-react'
import { BatchesTable } from '@/components/batches/batches-table'
import { ExpiringProductsReport } from '@/components/inventory/expiring-products-report'
import { cn } from '@/lib/utils'

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
        fetch(`/api/stores/${store.storeId}/products?pageSize=1000`),
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
        setProducts(productsData.products || productsData)
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
        return <TrendingUp className="h-4 w-4 text-emerald-500" />
      case 'SALE':
      case 'DAMAGE':
        return <TrendingDown className="h-4 w-4 text-rose-500" />
      default:
        return <Package className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getMovementLabel = (type: string) => {
    const labels: Record<string, string> = {
      'PURCHASE': 'Compra',
      'SALE': 'Venta',
      'RETURN': 'Devolución',
      'DAMAGE': 'Daño',
      'ADJUSTMENT': 'Ajuste'
    }
    return labels[type] || type
  }

  const getMovementColorClass = (quantity: number) => {
    return quantity > 0 ? 'text-emerald-500' : 'text-rose-500'
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
        icon={<Package className="h-8 w-8 text-primary animate-pulse" />}
      />
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
            Gestión de <span className="gradient-text">Inventario</span>
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Box className="h-4 w-4" />
            Controla tus niveles de stock y supervisa cada movimiento.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-4 py-2 rounded-xl backdrop-blur-sm border border-border/50">
          <Calendar className="h-4 w-4" />
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* Stock Alerts Summary */}
      {alerts && (alerts.summary.lowStockCount > 0 || alerts.summary.outOfStockCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="group relative overflow-hidden border-none bg-rose-600 text-white shadow-lg shadow-rose-500/20">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <AlertTriangle className="h-24 w-24" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-white/80">
                Sin Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black">{alerts.summary.outOfStockCount}</div>
              <p className="text-xs text-white/60 mt-2 font-medium">Productos requieren reposición inmediata</p>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-none bg-orange-500 text-white shadow-lg shadow-orange-500/20">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Bell className="h-24 w-24" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-white/80">
                Stock Bajo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black">{alerts.summary.lowStockCount}</div>
              <p className="text-xs text-white/60 mt-2 font-medium">Bajo el nivel de stock mínimo</p>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-none bg-primary text-white shadow-lg shadow-primary/20">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Package className="h-24 w-24" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-white/80">
                Total SKUs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black">{products.length}</div>
              <p className="text-xs text-white/60 mt-2 font-medium">Productos en tu catálogo activo</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs Section */}
      <Tabs defaultValue="movements" className="space-y-6">
        <TabsList className="bg-secondary/50 p-1 rounded-xl h-auto flex-wrap sm:flex-nowrap border border-border/50">
          <TabsTrigger value="movements" className="rounded-lg py-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <History className="h-4 w-4 mr-2" />
            Movimientos
          </TabsTrigger>
          <TabsTrigger value="adjust" className="rounded-lg py-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Settings2 className="h-4 w-4 mr-2" />
            Ajustar Stock
          </TabsTrigger>
          <TabsTrigger value="alerts" className="rounded-lg py-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Bell className="h-4 w-4 mr-2" />
            Alertas
          </TabsTrigger>
          <TabsTrigger value="batches" className="rounded-lg py-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Calendar className="h-4 w-4 mr-2" />
            Lotes
          </TabsTrigger>
          <TabsTrigger value="expiring" className="rounded-lg py-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Vencimientos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="movements" className="animate-in fade-in-50 duration-500">
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm border border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-xl font-bold">Historial de Movimientos</CardTitle>
                <CardDescription>Últimas 30 transacciones registradas</CardDescription>
              </div>
              <Badge variant="outline" className="px-3 py-1 font-bold rounded-lg uppercase tracking-tighter">
                {movements.length} Registros
              </Badge>
            </CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground opacity-20">
                  <History className="h-16 w-16 mb-4" />
                  <p className="font-medium text-lg">No hay movimientos registrados</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Fecha</th>
                        <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Producto</th>
                        <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo</th>
                        <th className="text-right py-4 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Cantidad</th>
                        <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Razón</th>
                        <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Usuario</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {movements.map((movement) => (
                        <tr key={movement.id} className="group hover:bg-secondary/20 transition-colors">
                          <td className="py-4 px-4">
                            <div className="text-sm font-medium">
                              {new Date(movement.createdAt).toLocaleDateString()}
                              <div className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">
                                {new Date(movement.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-sm">{movement.product?.name}</span>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{movement.product?.sku}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              {getMovementIcon(movement.type)}
                              <Badge variant="secondary" className="text-[10px] font-bold py-0 h-5 px-2 rounded-md uppercase tracking-tighter">
                                {getMovementLabel(movement.type)}
                              </Badge>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className={cn("text-base font-black tabular-nums", getMovementColorClass(movement.quantity))}>
                              {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm italic text-muted-foreground">
                              {movement.notes || movement.reference || '-'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                {movement.user?.name?.substring(0, 1) || 'S'}
                              </div>
                              <span className="text-xs font-bold uppercase tracking-tight">
                                {movement.user?.name || 'Sistema'}
                              </span>
                            </div>
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

        <TabsContent value="adjust" className="animate-in fade-in-50 duration-500">
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm border border-border/50">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold">Panel de Ajuste Manual</CardTitle>
                  <CardDescription>
                    Realiza correcciones de stock rápidas. Usa (+) para aumentar y (-) para disminuir.
                  </CardDescription>
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10 rounded-xl bg-background/50 border-border/50 focus:ring-primary"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground opacity-20">
                  <Package className="h-16 w-16 mb-4" />
                  <p className="font-medium text-lg">No se encontraron productos</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="group border border-border/50 rounded-2xl p-4 bg-background/30 hover:bg-background/80 hover:border-primary/30 transition-all duration-300"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-bold text-base leading-tight">{product.name}</h4>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{product.sku}</p>
                            <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase mt-1">
                              Stock: {product.currentStock}
                            </div>
                          </div>
                          {savingProductId === product.id && (
                            <Loader2 className="h-5 w-5 text-primary animate-spin" />
                          )}
                        </div>

                        <div className="grid grid-cols-5 gap-2">
                          <div className="col-span-2">
                            <div className="relative">
                              <Input
                                type="number"
                                placeholder="Cant."
                                value={adjustmentData[product.id]?.quantity ?? ''}
                                onChange={(e) => updateAdjustmentData(product.id, 'quantity', e.target.value)}
                                disabled={savingProductId === product.id}
                                className="h-10 rounded-xl bg-background/10 border-border/40 focus:ring-primary pl-4 text-sm font-bold"
                              />
                            </div>
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="text"
                              placeholder="Razón..."
                              value={adjustmentData[product.id]?.notes ?? ''}
                              onChange={(e) => updateAdjustmentData(product.id, 'notes', e.target.value)}
                              disabled={savingProductId === product.id}
                              className="h-10 rounded-xl bg-background/10 border-border/40 focus:ring-primary text-xs"
                            />
                          </div>
                          <Button
                            onClick={() => saveAdjustment(product.id)}
                            disabled={savingProductId === product.id || !adjustmentData[product.id]?.quantity}
                            size="icon"
                            className="h-10 w-10 rounded-xl shadow-lg shadow-primary/20 shrink-0"
                          >
                            <CheckCircle2 className="h-5 w-5" />
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

        <TabsContent value="alerts" className="animate-in fade-in-50 duration-500 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Out of Stock */}
            <Card className="border-none shadow-xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200/50 dark:border-rose-900/50 overflow-hidden">
              <div className="h-1.5 bg-rose-500" />
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-rose-500" />
                </div>
                <div>
                  <CardTitle className="text-rose-600 dark:text-rose-400 font-black">Sin Stock ({alerts?.outOfStock?.length || 0})</CardTitle>
                  <CardDescription>Requieren atención inmediata</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {alerts?.outOfStock?.length === 0 ? (
                  <p className="text-center py-10 text-muted-foreground/60 italic">No hay productos sin stock ✨</p>
                ) : (
                  alerts?.outOfStock?.map((product: any) => (
                    <div key={product.id} className="flex items-center justify-between p-4 bg-white/50 dark:bg-black/20 rounded-2xl border border-rose-200/30 dark:border-rose-900/30">
                      <div>
                        <p className="font-bold text-sm tracking-tight">{product.name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{product.sku}</p>
                      </div>
                      <Badge variant="destructive" className="h-6 rounded-lg font-black tracking-tighter uppercase px-2">0 Stock</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Low Stock */}
            <Card className="border-none shadow-xl bg-orange-50/50 dark:bg-orange-950/10 border border-orange-200/50 dark:border-orange-900/50 overflow-hidden">
              <div className="h-1.5 bg-orange-500" />
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                  <Bell className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <CardTitle className="text-orange-600 dark:text-orange-400 font-black">Stock Bajo ({alerts?.lowStock?.length || 0})</CardTitle>
                  <CardDescription>Próximos a agotarse</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {alerts?.lowStock?.length === 0 ? (
                  <p className="text-center py-10 text-muted-foreground/60 italic">Niveles saludables ✨</p>
                ) : (
                  alerts?.lowStock?.map((product: any) => (
                    <div key={product.id} className="flex items-center justify-between p-4 bg-white/50 dark:bg-black/20 rounded-2xl border border-orange-200/30 dark:border-orange-900/30">
                      <div>
                        <p className="font-bold text-sm tracking-tight">{product.name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{product.sku}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-orange-600 dark:text-orange-400">
                          {product.currentStock} <span className="text-[10px] font-bold text-muted-foreground uppercase">/ {product.minStockLevel || 0}</span>
                        </div>
                        <p className="text-[8px] font-black uppercase text-muted-foreground tracking-tighter">Actual / Mín</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {(!alerts || (alerts.outOfStock.length === 0 && alerts.lowStock.length === 0)) && (
            <Card className="bg-emerald-500/10 border border-emerald-500/20 py-24 shadow-2xl shadow-emerald-500/5">
              <CardContent className="flex flex-col items-center justify-center">
                <div className="h-24 w-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 animate-bounce">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mb-2">¡Inventario Saludable!</h3>
                <p className="text-muted-foreground font-medium">Todos tus productos tienen niveles de stock óptimos.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="batches" className="animate-in fade-in-50 duration-500">
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm border border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Gestión de Lotes
                </CardTitle>
                <CardDescription>Productos perecederos con trazabilidad industrial</CardDescription>
              </div>
              <Badge variant="outline" className="px-3 py-1 font-black rounded-lg uppercase tracking-tighter bg-primary/5 border-primary/20 text-primary">
                Control FIFO
              </Badge>
            </CardHeader>
            <CardContent>
              {store && <BatchesTable storeSlug={store.slug} />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiring" className="animate-in fade-in-50 duration-500">
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm border border-border/50 overflow-hidden">
            <div className="h-1.5 bg-yellow-400" />
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Control de Vencimientos
                </CardTitle>
                <CardDescription>Monitoreo preventivo de lotes próximos a vencer</CardDescription>
              </div>
              <div className="p-2 rounded-xl bg-yellow-500/10">
                <Calendar className="h-5 w-5 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent>
              <ExpiringProductsReport />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
