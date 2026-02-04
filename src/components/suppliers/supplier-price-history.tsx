'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, Calendar, Package, Upload, Download } from 'lucide-react'
import { PriceImportDialog } from './price-import-dialog'

interface PriceHistory {
  id: string
  productId: string
  productName: string
  productSku: string
  price: number
  currency: string
  effectiveDate: Date
  endDate?: Date
  changePercentage?: number
  supplierSku?: string
}

interface SupplierPriceHistoryProps {
  supplierId: string
  storeId: string
}

export function SupplierPriceHistory({ supplierId, storeId }: SupplierPriceHistoryProps) {
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchPriceHistory()
  }, [supplierId, storeId])

  const fetchPriceHistory = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(
        `/api/stores/${storeId}/suppliers/${supplierId}/prices?limit=50`
      )

      if (response.ok) {
        const data = await response.json()
        setPriceHistory(data)
      }
    } catch (error) {
      console.error('Error fetching price history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date))
  }

  const getPriceChangeIcon = (change?: number) => {
    if (!change) return <Minus className="h-4 w-4 text-muted-foreground" />
    if (change > 0) return <TrendingUp className="h-4 w-4 text-red-500" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-green-500" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  const getPriceChangeBadge = (change?: number) => {
    if (!change) return null
    const isIncrease = change > 0
    const formattedChange = Math.abs(change).toFixed(2)

    return (
      <Badge variant={isIncrease ? 'destructive' : 'default'} className="ml-2">
        {isIncrease ? '+' : '-'}{formattedChange}%
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <Card style={{ borderColor: 'var(--color-primary)' }}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Cargando historial de precios...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleExport = async () => {
    try {
      const response = await fetch(
        `/api/stores/${storeId}/suppliers/${supplierId}/prices/export?format=csv`
      )

      if (!response.ok) {
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `precios-proveedor-${supplierId}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  const handleImportSuccess = () => {
    fetchPriceHistory()
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Historial de Precios</h3>
          <p className="text-sm text-muted-foreground">
            Cambios de precios a lo largo del tiempo
          </p>
        </div>
        <div className="flex gap-2">
          {priceHistory.length > 0 && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          )}
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar Precios
          </Button>
        </div>
      </div>

      <PriceImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        storeId={storeId}
        supplierId={supplierId}
        onSuccess={handleImportSuccess}
      />

      {priceHistory.length === 0 ? (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="text-lg font-semibold mb-2">No hay historial de precios</h4>
            <p className="text-sm text-muted-foreground">
              Los cambios de precio se registrarán automáticamente cuando actualices los precios
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader>
            <CardTitle>Cambios de Precio ({priceHistory.length})</CardTitle>
            <CardDescription>
              Últimos {priceHistory.length} cambios de precio registrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {priceHistory.map((priceRecord) => (
                <div
                  key={priceRecord.id}
                  className="flex items-start gap-4 pb-6 border-b last:border-0"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {getPriceChangeIcon(priceRecord.changePercentage)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">{priceRecord.productName}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          SKU: {priceRecord.productSku}
                          {priceRecord.supplierSku && ` | SKU Proveedor: ${priceRecord.supplierSku}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">
                          {formatCurrency(Number(priceRecord.price), priceRecord.currency)}
                        </p>
                        {getPriceChangeBadge(priceRecord.changePercentage)}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Desde: {formatDate(priceRecord.effectiveDate)}</span>
                      </div>
                      {priceRecord.endDate && (
                        <div className="flex items-center gap-1">
                          <span>Hasta: {formatDate(priceRecord.endDate)}</span>
                        </div>
                      )}
                      {!priceRecord.endDate && (
                        <Badge variant="outline" className="text-xs">
                          Precio Actual
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
