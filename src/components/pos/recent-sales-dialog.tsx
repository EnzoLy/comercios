'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Copy } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { toast } from 'sonner'

interface SaleItem {
  id: string
  productId: string
  productName: string
  productSku: string
  quantity: number
  unitPrice: number
  discount: number
  isActive: boolean
}

interface RecentSale {
  id: string
  createdAt: string
  total: number
  itemCount: number
  items: SaleItem[]
}

interface RecentSalesDialogProps {
  storeId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onDuplicateSale: (items: any[]) => void
}

export function RecentSalesDialog({
  storeId,
  isOpen,
  onOpenChange,
  onDuplicateSale,
}: RecentSalesDialogProps) {
  const [sales, setSales] = useState<RecentSale[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchRecentSales()
    }
  }, [isOpen])

  const fetchRecentSales = async () => {
    setIsLoading(true)
    try {
      const activeUserId = localStorage.getItem('activeUserId')
      const queryParam = activeUserId ? `?activeUserId=${activeUserId}` : ''

      const response = await fetch(`/api/stores/${storeId}/pos/recent-sales${queryParam}`)
      if (response.ok) {
        const data = await response.json()
        setSales(data)
      } else {
        toast.error('Error al cargar las ventas recientes')
      }
    } catch (error) {
      console.error('Error fetching recent sales:', error)
      toast.error('Error al cargar las ventas recientes')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDuplicate = (sale: RecentSale) => {
    if (sale.items.length === 0) {
      toast.error('La venta no tiene artículos')
      return
    }

    const cartItems = sale.items.map((item) => ({
      productId: item.productId,
      name: item.productName,
      sku: item.productSku,
      price: item.unitPrice,
      quantity: item.quantity,
      stock: 0, // Will be checked when adding to cart
      taxRate: 0,
      discount: item.discount,
      isActive: item.isActive,
    }))

    onDuplicateSale(cartItems)
    onOpenChange(false)
    toast.success(`Se duplicaron ${sale.itemCount} artículos`)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Últimas Ventas</DialogTitle>
          <DialogDescription>
            Selecciona una venta para duplicarla
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-96 overflow-auto space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : sales.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-center">
              <p className="text-sm text-gray-500">
                No hay ventas recientes
              </p>
            </div>
          ) : (
            sales.map((sale) => (
              <div
                key={sale.id}
                className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {formatDate(sale.createdAt)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {sale.itemCount} artículo{sale.itemCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatCurrency(sale.total)}
                  </p>
                </div>

                <div className="mb-2 space-y-1">
                  {sale.items.slice(0, 3).map((item) => (
                    <p key={item.id} className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {item.quantity}x {item.productName}
                    </p>
                  ))}
                  {sale.items.length > 3 && (
                    <p className="text-xs text-gray-500">
                      +{sale.items.length - 3} más
                    </p>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleDuplicate(sale)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
