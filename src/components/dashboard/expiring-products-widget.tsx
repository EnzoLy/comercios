'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useStore } from '@/hooks/use-store'
import { AlertTriangle, Calendar, ArrowRight, Package } from 'lucide-react'

interface ExpiringProduct {
  product: {
    id: string
    name: string
    sku: string
  }
  batches: Array<{
    id: string
    batchNumber?: string
    expirationDate: string
    currentQuantity: number
    daysUntilExpiration: number
  }>
}

export function ExpiringProductsWidget({ storeSlug }: { storeSlug: string }) {
  const store = useStore()
  const [products, setProducts] = useState<ExpiringProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (store) {
      loadExpiringProducts()
    }
  }, [store])

  const loadExpiringProducts = async () => {
    if (!store) return

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/stores/${store.storeId}/reports/expiring-products?days=30`
      )

      if (!response.ok) {
        throw new Error('Failed to load expiring products')
      }

      const data = await response.json()
      // Tomar solo los primeros 5 productos
      setProducts(data.products?.slice(0, 5) || [])
    } catch (error) {
      console.error('Error loading expiring products:', error)
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }

  const getSeverityColor = (days: number) => {
    if (days < 0) return 'bg-red-600 hover:bg-red-700'
    if (days <= 7) return 'bg-red-600 hover:bg-red-700'
    if (days <= 15) return 'bg-orange-600 hover:bg-orange-700'
    if (days <= 30) return 'bg-yellow-600 hover:bg-yellow-700'
    return 'bg-gray-600 hover:bg-gray-700'
  }

  const getSeverityLabel = (days: number) => {
    if (days < 0) return `Vencido (${Math.abs(days)} días)`
    if (days === 0) return 'Vence hoy'
    if (days === 1) return 'Vence mañana'
    return `${days} días`
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Productos por Vencer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <div className="animate-pulse">Cargando...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            Productos por Vencer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No hay productos próximos a vencer</p>
            <p className="text-xs mt-1">Todo tu inventario está en buen estado</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          Productos por Vencer
        </CardTitle>
        <Badge variant="secondary">{products.length}</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {products.map((item) => {
            // Tomar el lote más próximo a vencer
            const nearestBatch = item.batches.reduce((nearest, batch) =>
              batch.daysUntilExpiration < nearest.daysUntilExpiration ? batch : nearest
            )

            // Contar total de lotes
            const totalBatches = item.batches.length
            const totalQuantity = item.batches.reduce((sum, b) => sum + b.currentQuantity, 0)

            return (
              <div
                key={item.product.id}
                className="flex items-start justify-between gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.product.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{item.product.sku}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="secondary"
                      className={`${getSeverityColor(nearestBatch.daysUntilExpiration)} text-white text-xs`}
                    >
                      {getSeverityLabel(nearestBatch.daysUntilExpiration)}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {totalBatches} lote{totalBatches !== 1 ? 's' : ''} • {totalQuantity} unid.
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Vence: {new Date(nearestBatch.expirationDate).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <Link href={`/dashboard/${storeSlug}/inventory`}>
          <Button variant="ghost" className="w-full mt-4" size="sm">
            Ver todos
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
