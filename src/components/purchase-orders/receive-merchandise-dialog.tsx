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
import { Loader2, Package } from 'lucide-react'

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

  const onSubmit = async (data: ReceiveItemsInput) => {
    if (!store) {
      toast.error('Store context not found')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/stores/${store.storeId}/purchase-orders/${purchaseOrder.id}/receive`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
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
