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
import { createBatchSchema, type CreateBatchInput } from '@/lib/validations/batch.schema'
import { useStore } from '@/hooks/use-store'
import { Loader2, Package } from 'lucide-react'

interface CreateBatchDialogProps {
  isOpen: boolean
  onClose: () => void
  preselectedProductId?: string
}

export function CreateBatchDialog({
  isOpen,
  onClose,
  preselectedProductId,
}: CreateBatchDialogProps) {
  const router = useRouter()
  const store = useStore()
  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CreateBatchInput>({
    resolver: zodResolver(createBatchSchema),
    defaultValues: {
      productId: preselectedProductId || '',
      initialQuantity: 1,
      unitCost: 0,
    },
  })

  const selectedProductId = watch('productId')

  useEffect(() => {
    if (isOpen && store) {
      loadProducts()
    }
  }, [isOpen, store])

  useEffect(() => {
    if (preselectedProductId) {
      setValue('productId', preselectedProductId)
    }
  }, [preselectedProductId])

  const loadProducts = async () => {
    if (!store) return

    setLoadingProducts(true)
    try {
      const response = await fetch(`/api/stores/${store.storeId}/products?limit=1000`)
      if (!response.ok) {
        throw new Error('Failed to load products')
      }

      const data = await response.json()
      // Filtrar solo productos con trackExpirationDates habilitado
      const productsWithTracking = data.products?.filter(
        (p: any) => p.trackExpirationDates
      ) || []
      setProducts(productsWithTracking)
    } catch (error) {
      console.error('Error loading products:', error)
      toast.error('Error al cargar productos')
    } finally {
      setLoadingProducts(false)
    }
  }

  const onSubmit = async (data: CreateBatchInput) => {
    if (!store) {
      toast.error('Contexto de tienda no encontrado')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/stores/${store.storeId}/products/${data.productId}/batches`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Error al crear lote')
        return
      }

      toast.success('Lote creado exitosamente')
      reset()
      onClose()
      router.refresh()
    } catch (error) {
      toast.error('Ocurrió un error. Por favor intenta de nuevo.')
      console.error('Create batch error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Crear Lote Manual
          </DialogTitle>
          <DialogDescription>
            Crea un lote manualmente para productos con stock existente o ajustes de inventario.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productId">Producto *</Label>
            <Select
              value={selectedProductId}
              onValueChange={(value) => setValue('productId', value)}
              disabled={isLoading || loadingProducts || !!preselectedProductId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un producto" />
              </SelectTrigger>
              <SelectContent>
                {loadingProducts ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    Cargando productos...
                  </div>
                ) : products.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No hay productos con seguimiento de vencimientos habilitado
                  </div>
                ) : (
                  products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.sku}) - Stock: {product.currentStock}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.productId?.message && (
              <p className="text-sm text-red-500">{errors.productId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batchNumber">Número de Lote (opcional)</Label>
              <Input
                id="batchNumber"
                placeholder="Ej: LOTE-2026-001"
                {...register('batchNumber')}
                disabled={isLoading}
              />
              {errors.batchNumber?.message && (
                <p className="text-sm text-red-500">{errors.batchNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expirationDate">Fecha de Vencimiento *</Label>
              <Input
                id="expirationDate"
                type="date"
                {...register('expirationDate')}
                disabled={isLoading}
              />
              {errors.expirationDate?.message && (
                <p className="text-sm text-red-500">{errors.expirationDate.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="initialQuantity">Cantidad *</Label>
              <Input
                id="initialQuantity"
                type="number"
                min="1"
                placeholder="0"
                {...register('initialQuantity', { valueAsNumber: true })}
                disabled={isLoading}
              />
              {errors.initialQuantity?.message && (
                <p className="text-sm text-red-500">{errors.initialQuantity.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitCost">Costo Unitario *</Label>
              <Input
                id="unitCost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register('unitCost', { valueAsNumber: true })}
                disabled={isLoading}
              />
              {errors.unitCost?.message && (
                <p className="text-sm text-red-500">{errors.unitCost.message}</p>
              )}
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Nota:</strong> Este lote se creará como un ajuste de inventario y actualizará
              el stock del producto automáticamente.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !selectedProductId}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Lote
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
