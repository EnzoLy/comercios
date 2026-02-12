'use client'

import { useState } from 'react'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { receiveItemsSchema, type ReceiveItemsInput } from '@/lib/validations/purchase-order.schema'
import { useStore } from '@/hooks/use-store'
import { Loader2, Package, Plus, X } from 'lucide-react'

interface ReceiveMerchandiseDialogProps {
  purchaseOrder: any
  storeSlug: string
}

export function ReceiveMerchandiseDialog({
  purchaseOrder,
  storeSlug,
}: ReceiveMerchandiseDialogProps) {
  const router = useRouter()
  const store = useStore()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Estado para gestionar lotes por item
  const [batches, setBatches] = useState<Record<number, Array<{
    batchNumber?: string
    expirationDate: string
    quantity: number
  }>>>({})

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ReceiveItemsInput>({
    resolver: zodResolver(receiveItemsSchema),
    defaultValues: {
      items: purchaseOrder.items?.map((item: any) => ({
        itemId: item.id,
        quantityReceived: item.quantityOrdered - item.quantityReceived,
      })),
    },
  })

  const items = watch('items')

  // Funciones para manejar batches
  const addBatch = (itemIndex: number) => {
    setBatches((prev) => ({
      ...prev,
      [itemIndex]: [
        ...(prev[itemIndex] || []),
        { expirationDate: '', quantity: 0 },
      ],
    }))
  }

  const removeBatch = (itemIndex: number, batchIndex: number) => {
    setBatches((prev) => ({
      ...prev,
      [itemIndex]: prev[itemIndex].filter((_, i) => i !== batchIndex),
    }))
  }

  const updateBatch = (
    itemIndex: number,
    batchIndex: number,
    field: 'batchNumber' | 'expirationDate' | 'quantity',
    value: string | number
  ) => {
    setBatches((prev) => ({
      ...prev,
      [itemIndex]: prev[itemIndex].map((batch, i) =>
        i === batchIndex ? { ...batch, [field]: value } : batch
      ),
    }))
  }

  const getBatchSum = (itemIndex: number) => {
    return (batches[itemIndex] || []).reduce((sum, batch) => sum + (batch.quantity || 0), 0)
  }

  const onSubmit = async (data: ReceiveItemsInput) => {
    if (!store) {
      toast.error('Store context not found')
      return
    }

    // Validar batches para productos que requieren tracking
    const itemsWithBatches = data.items.map((item, index) => {
      const poItem = purchaseOrder.items?.find((i: any) => i.id === item.itemId)

      if (poItem?.product?.trackExpirationDates) {
        const itemBatches = batches[index] || []

        // Validar que hay batches
        if (item.quantityReceived > 0 && itemBatches.length === 0) {
          toast.error(`${poItem.product.name} requiere información de lotes`)
          throw new Error('Missing batches')
        }

        // Validar que la suma coincide
        const batchSum = getBatchSum(index)
        if (item.quantityReceived > 0 && batchSum !== item.quantityReceived) {
          toast.error(
            `${poItem.product.name}: La suma de lotes (${batchSum}) debe ser igual a la cantidad recibida (${item.quantityReceived})`
          )
          throw new Error('Batch sum mismatch')
        }

        return {
          ...item,
          batches: itemBatches.length > 0 ? itemBatches : undefined,
        }
      }

      return item
    })

    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/stores/${store.storeId}/purchase-orders/${purchaseOrder.id}/receive`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: itemsWithBatches }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Error al recibir mercancía')
        return
      }

      toast.success('Mercancía recibida exitosamente')
      setIsOpen(false)
      router.refresh()
    } catch (error) {
      toast.error('Ocurrió un error. Por favor intenta de nuevo.')
      console.error('Receive merchandise error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Package className="mr-2 h-4 w-4" />
          Recibir Mercancía
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recibir Mercancía</DialogTitle>
          <DialogDescription>
            Registra la cantidad de productos recibidos. Puedes recibir parcialmente y actualizar
            después.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Producto</th>
                    <th className="text-center py-2 px-2 w-24">Ordenado</th>
                    <th className="text-center py-2 px-2 w-24">Ya Recibido</th>
                    <th className="text-center py-2 px-2 w-32">Recibir Ahora</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrder.items?.map((item: any, index: number) => {
                    const remaining = item.quantityOrdered - item.quantityReceived
                    const currentValue = items[index]?.quantityReceived || 0

                    return (
                      <tr key={item.id} className="border-b">
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-medium text-sm">{item.product?.name}</p>
                            <p className="text-xs text-gray-500">{item.product?.sku}</p>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center">{item.quantityOrdered}</td>
                        <td className="py-3 px-2 text-center">
                          <span
                            className={
                              item.quantityReceived === item.quantityOrdered
                                ? 'text-green-600'
                                : item.quantityReceived > 0
                                ? 'text-yellow-600'
                                : ''
                            }
                          >
                            {item.quantityReceived}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="space-y-1">
                            <Input
                              type="number"
                              min="0"
                              max={remaining}
                              className="w-full text-center"
                              {...register(`items.${index}.quantityReceived`, {
                                valueAsNumber: true,
                              })}
                              disabled={isLoading || remaining === 0}
                            />
                            <input
                              type="hidden"
                              {...register(`items.${index}.itemId`)}
                              value={item.id}
                            />
                            {remaining > 0 && (
                              <p className="text-xs text-gray-500 text-center">
                                Pendiente: {remaining}
                              </p>
                            )}
                            {remaining === 0 && (
                              <p className="text-xs text-green-600 text-center">
                                Completo
                              </p>
                            )}
                            {errors.items?.[index]?.quantityReceived && (
                              <p className="text-xs text-red-500 text-center">
                                {errors.items[index]?.quantityReceived?.message}
                              </p>
                            )}
                          </div>

                          {/* Sección de lotes para productos con tracking */}
                          {item.product?.trackExpirationDates && currentValue > 0 && (
                            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold">Lotes con fechas de vencimiento:</Label>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addBatch(index)}
                                  disabled={isLoading}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Lote
                                </Button>
                              </div>

                              {batches[index]?.map((batch, bIdx) => (
                                <div key={bIdx} className="flex gap-2 items-start">
                                  <div className="flex-1 space-y-1">
                                    <Input
                                      placeholder="# Lote (opcional)"
                                      value={batch.batchNumber || ''}
                                      onChange={(e) => updateBatch(index, bIdx, 'batchNumber', e.target.value)}
                                      className="text-xs h-8"
                                      disabled={isLoading}
                                    />
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    <Input
                                      type="date"
                                      value={batch.expirationDate}
                                      onChange={(e) => updateBatch(index, bIdx, 'expirationDate', e.target.value)}
                                      className="text-xs h-8"
                                      disabled={isLoading}
                                      required
                                    />
                                  </div>
                                  <div className="w-20 space-y-1">
                                    <Input
                                      type="number"
                                      min="1"
                                      placeholder="Cant."
                                      value={batch.quantity || ''}
                                      onChange={(e) => updateBatch(index, bIdx, 'quantity', parseInt(e.target.value) || 0)}
                                      className="text-xs h-8 text-center"
                                      disabled={isLoading}
                                      required
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeBatch(index, bIdx)}
                                    disabled={isLoading}
                                    className="h-8 w-8 p-0"
                                  >
                                    <X className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              ))}

                              {batches[index]?.length > 0 && getBatchSum(index) !== currentValue && (
                                <p className="text-xs text-red-500">
                                  ⚠️ Los lotes deben sumar {currentValue} unidades (actualmente: {getBatchSum(index)})
                                </p>
                              )}

                              {(!batches[index] || batches[index].length === 0) && (
                                <p className="text-xs text-yellow-600">
                                  ⚠️ Debes agregar al menos un lote con fecha de vencimiento
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {errors.items && typeof errors.items.message === 'string' && (
              <p className="text-sm text-red-500">{errors.items.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Recepción
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
