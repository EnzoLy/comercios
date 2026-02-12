'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/hooks/use-store'
import {
  AlertTriangle,
  Calendar,
  Download,
  ChevronDown,
  ChevronRight,
  Package,
} from 'lucide-react'
import { toast } from 'sonner'

interface ExpiringProduct {
  product: {
    id: string
    name: string
    sku: string
    category?: { name: string }
  }
  batches: Array<{
    id: string
    batchNumber?: string
    expirationDate: string
    currentQuantity: number
    daysUntilExpiration: number
  }>
}

export function ExpiringProductsReport() {
  const store = useStore()
  const [products, setProducts] = useState<ExpiringProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [daysFilter, setDaysFilter] = useState('30')
  const [onlyExpired, setOnlyExpired] = useState(false)
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (store) {
      loadReport()
    }
  }, [store, daysFilter, onlyExpired])

  const loadReport = async () => {
    if (!store) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('days', daysFilter)
      if (onlyExpired) {
        params.append('onlyExpired', 'true')
      }

      const response = await fetch(
        `/api/stores/${store.storeId}/reports/expiring-products?${params}`
      )

      if (!response.ok) {
        throw new Error('Failed to load report')
      }

      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('Error loading report:', error)
      toast.error('Error al cargar reporte')
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }

  const toggleProductExpanded = (productId: string) => {
    setExpandedProducts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }

  const getSeverityColor = (days: number) => {
    if (days < 0) return 'bg-red-600 text-white'
    if (days <= 7) return 'bg-red-600 text-white'
    if (days <= 15) return 'bg-orange-600 text-white'
    if (days <= 30) return 'bg-yellow-600 text-white'
    return 'bg-gray-600 text-white'
  }

  const getSeverityLabel = (days: number) => {
    if (days < 0) return `Vencido (${Math.abs(days)} días)`
    if (days === 0) return 'Vence hoy'
    if (days === 1) return 'Vence mañana'
    return `${days} días restantes`
  }

  const exportToCSV = () => {
    if (products.length === 0) {
      toast.error('No hay datos para exportar')
      return
    }

    const headers = ['Producto', 'SKU', 'Categoría', '# Lote', 'Vencimiento', 'Cantidad', 'Estado (días)']
    const rows: string[][] = []

    products.forEach((item) => {
      item.batches.forEach((batch) => {
        rows.push([
          `"${item.product.name}"`,
          item.product.sku,
          item.product.category?.name || 'Sin categoría',
          batch.batchNumber || '-',
          new Date(batch.expirationDate).toLocaleDateString('es-ES'),
          batch.currentQuantity.toString(),
          batch.daysUntilExpiration.toString(),
        ])
      })
    })

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `productos-por-vencer-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success('Reporte exportado exitosamente')
  }

  const totalProducts = products.length
  const totalBatches = products.reduce((sum, p) => sum + p.batches.length, 0)
  const totalUnits = products.reduce(
    (sum, p) => sum + p.batches.reduce((s, b) => s + b.currentQuantity, 0),
    0
  )

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Productos Afectados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">productos con lotes por vencer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Lotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBatches}</div>
            <p className="text-xs text-muted-foreground">lotes identificados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unidades Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUnits}</div>
            <p className="text-xs text-muted-foreground">unidades en riesgo</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Label htmlFor="daysFilter">Días hasta vencimiento</Label>
          <Select value={daysFilter} onValueChange={setDaysFilter}>
            <SelectTrigger id="daysFilter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Próximos 7 días</SelectItem>
              <SelectItem value="15">Próximos 15 días</SelectItem>
              <SelectItem value="30">Próximos 30 días</SelectItem>
              <SelectItem value="60">Próximos 60 días</SelectItem>
              <SelectItem value="90">Próximos 90 días</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2">
          <Button
            variant={onlyExpired ? 'default' : 'outline'}
            onClick={() => setOnlyExpired(!onlyExpired)}
          >
            {onlyExpired ? 'Mostrando solo vencidos' : 'Mostrar solo vencidos'}
          </Button>
          <Button onClick={exportToCSV} disabled={isLoading || products.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Cargando reporte...</div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">No se encontraron productos con los filtros seleccionados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Lotes</TableHead>
                <TableHead className="text-right">Unidades</TableHead>
                <TableHead>Estado Crítico</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((item) => {
                const isExpanded = expandedProducts.has(item.product.id)
                const nearestBatch = item.batches.reduce((nearest, batch) =>
                  batch.daysUntilExpiration < nearest.daysUntilExpiration ? batch : nearest
                )
                const totalQuantity = item.batches.reduce((sum, b) => sum + b.currentQuantity, 0)

                return (
                  <>
                    <TableRow
                      key={item.product.id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => toggleProductExpanded(item.product.id)}
                    >
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{item.product.name}</TableCell>
                      <TableCell className="font-mono text-sm">{item.product.sku}</TableCell>
                      <TableCell className="text-right">{item.batches.length}</TableCell>
                      <TableCell className="text-right font-semibold">{totalQuantity}</TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(nearestBatch.daysUntilExpiration)}>
                          {getSeverityLabel(nearestBatch.daysUntilExpiration)}
                        </Badge>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-gray-50 dark:bg-gray-900 p-4">
                          <div className="space-y-2">
                            <p className="text-sm font-semibold mb-3">Detalle de Lotes:</p>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs"># Lote</TableHead>
                                  <TableHead className="text-xs">Fecha Vencimiento</TableHead>
                                  <TableHead className="text-xs text-right">Cantidad</TableHead>
                                  <TableHead className="text-xs">Estado</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {item.batches.map((batch) => (
                                  <TableRow key={batch.id}>
                                    <TableCell className="font-mono text-xs">
                                      {batch.batchNumber || <span className="text-gray-400">-</span>}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {new Date(batch.expirationDate).toLocaleDateString('es-ES')}
                                    </TableCell>
                                    <TableCell className="text-xs text-right font-semibold">
                                      {batch.currentQuantity}
                                    </TableCell>
                                    <TableCell>
                                      <Badge className={`text-xs ${getSeverityColor(batch.daysUntilExpiration)}`}>
                                        {getSeverityLabel(batch.daysUntilExpiration)}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
