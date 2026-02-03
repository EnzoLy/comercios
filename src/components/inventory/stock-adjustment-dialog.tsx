'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { stockAdjustmentSchema, type StockAdjustmentInput } from '@/lib/validations/stock.schema'
import { MovementType } from '@/lib/db/entities/stock-movement.entity'
import { useStore } from '@/hooks/use-store'
import { Loader2 } from 'lucide-react'

interface StockAdjustmentDialogProps {
  isOpen: boolean
  onClose: () => void
  products: any[]
  selectedProductId?: string
}

export function StockAdjustmentDialog({
  isOpen,
  onClose,
  products,
  selectedProductId,
}: StockAdjustmentDialogProps) {
  const router = useRouter()
  const store = useStore()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<StockAdjustmentInput>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      productId: selectedProductId || '',
      quantity: 0,
      notes: '',
    },
  })

  const productId = watch('productId')

  useEffect(() => {
    if (productId) {
      const product = products.find((p) => p.id === productId)
      setSelectedProduct(product)
    } else {
      setSelectedProduct(null)
    }
  }, [productId, products])

  useEffect(() => {
    if (selectedProductId) {
      setValue('productId', selectedProductId)
    }
  }, [selectedProductId, setValue])

  const onSubmit = async (data: StockAdjustmentInput) => {
    if (!store) return

    setIsLoading(true)

    try {
      const movementData = {
        productId: data.productId,
        type: MovementType.ADJUSTMENT,
        quantity: data.quantity,
        notes: data.notes,
      }

      const response = await fetch(`/api/stores/${store.storeId}/inventory/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movementData),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Error al ajustar el stock')
        return
      }

      toast.success('¡Stock ajustado exitosamente!')
      reset()
      onClose()
      router.refresh()
    } catch (error) {
      toast.error('Ocurrió un error. Por favor intenta de nuevo.')
      console.error('Stock adjustment error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar Stock</DialogTitle>
          <DialogDescription>
            Ajusta manualmente los niveles de stock del producto. Usa números positivos para agregar stock,
            números negativos para quitar stock.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productId">Producto *</Label>
            <Select
              value={productId}
              onValueChange={(value) => setValue('productId', value)}
              disabled={isLoading || !!selectedProductId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} - {product.sku} (Actual: {product.currentStock})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.productId && (
              <p className="text-sm text-red-500">{errors.productId.message}</p>
            )}
          </div>

          {selectedProduct && (
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Stock Actual:</span>
                  <span className="font-semibold">{selectedProduct.currentStock}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Nivel Mín:</span>
                  <span>{selectedProduct.minStockLevel}</span>
                </div>
                {selectedProduct.maxStockLevel && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nivel Máx:</span>
                    <span>{selectedProduct.maxStockLevel}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad de Ajuste *</Label>
            <Input
              id="quantity"
              type="number"
              placeholder="Usa + para agregar, - para quitar"
              {...register('quantity', { valueAsNumber: true })}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">
              Ejemplo: +10 agrega 10 unidades, -5 quita 5 unidades
            </p>
            {errors.quantity && (
              <p className="text-sm text-red-500">{errors.quantity.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas *</Label>
            <Input
              id="notes"
              placeholder="Razón del ajuste"
              {...register('notes')}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">
              Requerido: Explica por qué estás ajustando el stock
            </p>
            {errors.notes && (
              <p className="text-sm text-red-500">{errors.notes.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajustar Stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
