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
import { Loader2, Package, Plus, X, CheckCircle2, AlertCircle, Calendar, Hash, ArrowRight, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'

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
        <Button className="rounded-xl h-11 px-6 font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
          <Package className="mr-2 h-5 w-5" />
          Recibir Mercancía
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
        <div className="bg-slate-900 text-white p-8 relative">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Truck className="h-24 w-24" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-3xl font-black tracking-tight">Registro de Recepción</DialogTitle>
            <DialogDescription className="text-white/60 font-medium">
              Gestiona el ingreso de mercadería al almacén. Puedes registrar recepciones parciales si el despacho no está completo.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary/30">
                    <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Producto / SKU</th>
                    <th className="text-center py-4 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-32">Estado Previo</th>
                    <th className="text-right py-4 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-40">Ingresar Cantidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {purchaseOrder.items?.map((item: any, index: number) => {
                    const remaining = item.quantityOrdered - item.quantityReceived
                    const currentValue = items[index]?.quantityReceived || 0
                    const isComplete = remaining === 0

                    return (
                      <tr key={item.id} className={cn(
                        "transition-colors",
                        isComplete ? "bg-emerald-500/5 opacity-60" : "hover:bg-secondary/10"
                      )}>
                        <td className="py-4 px-6">
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center font-black text-xs",
                              isComplete ? "bg-emerald-500/20 text-emerald-600" : "bg-secondary text-muted-foreground"
                            )}>
                              {isComplete ? <CheckCircle2 className="h-5 w-5" /> : item.product?.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-sm tracking-tight">{item.product?.name}</p>
                              <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60">SKU: {item.product?.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex items-center flex-col gap-1">
                            <span className="text-xs font-black uppercase opacity-40">De {item.quantityOrdered} und.</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-sm">{item.quantityReceived}</span>
                              <ArrowRight className="h-3 w-3 opacity-30" />
                              <span className={cn(
                                "font-mono font-black text-sm",
                                isComplete ? "text-emerald-500" : "text-amber-500"
                              )}>{item.quantityReceived + currentValue}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="space-y-1">
                            <Input
                              type="number"
                              min="0"
                              max={remaining}
                              className={cn(
                                "h-10 text-center font-black rounded-xl bg-secondary/50 border-border/30 tabular-nums focus:ring-primary",
                                currentValue > 0 && "border-primary/50 bg-primary/5"
                              )}
                              {...register(`items.${index}.quantityReceived`, {
                                valueAsNumber: true,
                              })}
                              disabled={isLoading || isComplete}
                            />
                            <input
                              type="hidden"
                              {...register(`items.${index}.itemId`)}
                              value={item.id}
                            />
                            {!isComplete && (
                              <p className="text-[9px] font-black text-center uppercase tracking-tighter text-muted-foreground mt-1">
                                {remaining} Pendientes
                              </p>
                            )}
                            {errors.items?.[index]?.quantityReceived && (
                              <p className="text-[9px] font-black text-rose-500 text-center uppercase mt-1 leading-tight">
                                {errors.items[index]?.quantityReceived?.message}
                              </p>
                            )}
                          </div>

                          {/* Sección de lotes para productos con tracking */}
                          {item.product?.trackExpirationDates && currentValue > 0 && (
                            <div className="mt-4 p-4 bg-primary/5 border border-primary/10 rounded-2xl space-y-4 animate-in slide-in-from-top-2 duration-300">
                              <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-3.5 w-3.5 text-primary" />
                                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Detalle de Lotes</Label>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => addBatch(index)}
                                  disabled={isLoading}
                                  className="h-7 text-[10px] font-black uppercase bg-primary text-white rounded-lg hover:bg-primary/90"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Agregar
                                </Button>
                              </div>

                              <div className="space-y-2">
                                {batches[index]?.map((batch, bIdx) => (
                                  <div key={bIdx} className="flex gap-2 items-start relative group">
                                    <div className="grid grid-cols-4 gap-2 flex-1">
                                      <div className="col-span-1">
                                        <div className="relative">
                                          <Hash className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground opacity-50" />
                                          <Input
                                            placeholder="Lote"
                                            value={batch.batchNumber || ''}
                                            onChange={(e) => updateBatch(index, bIdx, 'batchNumber', e.target.value)}
                                            className="text-[10px] h-8 pl-6 rounded-lg font-bold"
                                            disabled={isLoading}
                                          />
                                        </div>
                                      </div>
                                      <div className="col-span-2">
                                        <div className="relative">
                                          <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground opacity-50" />
                                          <Input
                                            type="date"
                                            value={batch.expirationDate}
                                            onChange={(e) => updateBatch(index, bIdx, 'expirationDate', e.target.value)}
                                            className="text-[10px] h-8 pl-6 rounded-lg font-bold"
                                            disabled={isLoading}
                                            required
                                          />
                                        </div>
                                      </div>
                                      <div className="col-span-1">
                                        <Input
                                          type="number"
                                          min="1"
                                          placeholder="Cant."
                                          value={batch.quantity || ''}
                                          onChange={(e) => updateBatch(index, bIdx, 'quantity', parseInt(e.target.value) || 0)}
                                          className="text-[10px] h-8 text-center rounded-lg font-black bg-white shadow-sm"
                                          disabled={isLoading}
                                          required
                                        />
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeBatch(index, bIdx)}
                                      disabled={isLoading}
                                      className="h-8 w-8 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-500/10 transition-colors"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>

                              {batches[index]?.length > 0 && getBatchSum(index) !== currentValue && (
                                <div className="flex items-center gap-2 p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
                                  <AlertCircle className="h-3 w-3 text-rose-500" />
                                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">
                                    Suma de lotes: {getBatchSum(index)} / {currentValue} requeridos
                                  </p>
                                </div>
                              )}

                              {(!batches[index] || batches[index].length === 0) && (
                                <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                  <AlertCircle className="h-3 w-3 text-amber-500" />
                                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">
                                    Requiere al menos una fecha de vencimiento
                                  </p>
                                </div>
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
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-rose-500" />
                <p className="text-sm font-bold text-rose-500">{errors.items.message}</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-3 sm:gap-0 bg-secondary/20 -mx-8 -mb-8 p-6 px-8 mt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
              className="rounded-xl font-bold h-11"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="rounded-xl h-11 px-8 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Habilitar Mercadería
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
