'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { RotateCcw, PackageCheck } from 'lucide-react'

interface SaleItemData {
  id: string
  productId: string | null
  productName: string
  productSku?: string | null
  quantity: number
  unitPrice: number
  alreadyReturned: number
}

interface ReturnDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  saleId: string
  items: SaleItemData[]
}

const refundMethodLabels: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia Bancaria',
  QR: 'QR',
  STORE_CREDIT: 'Crédito en Tienda',
}

interface ItemState {
  selected: boolean
  quantity: number
  restockItem: boolean
}

export function ReturnDialog({
  open,
  onOpenChange,
  storeId,
  saleId,
  items,
}: ReturnDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [refundMethod, setRefundMethod] = useState<string>('CASH')
  const [notes, setNotes] = useState('')

  const productItems = useMemo(
    () => items.filter((i) => i.productId !== null && i.quantity - i.alreadyReturned > 0),
    [items]
  )

  const [itemStates, setItemStates] = useState<Record<string, ItemState>>(() => {
    const initial: Record<string, ItemState> = {}
    for (const item of productItems) {
      initial[item.id] = {
        selected: false,
        quantity: item.quantity - item.alreadyReturned,
        restockItem: true,
      }
    }
    return initial
  })

  const selectedItems = productItems.filter((i) => itemStates[i.id]?.selected)

  const computedRefundAmount = useMemo(() => {
    return selectedItems.reduce((sum, item) => {
      const state = itemStates[item.id]
      return sum + state.quantity * Number(item.unitPrice)
    }, 0)
  }, [selectedItems, itemStates])

  const [refundAmount, setRefundAmount] = useState<string>('')
  const displayRefundAmount =
    refundAmount !== '' ? refundAmount : computedRefundAmount.toFixed(2)

  function updateItemState(id: string, patch: Partial<ItemState>) {
    setItemStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  async function handleSubmit() {
    if (selectedItems.length === 0) {
      toast.error('Seleccione al menos un artículo para devolver')
      return
    }

    const amount = parseFloat(displayRefundAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('El monto de reembolso debe ser mayor a cero')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/stores/${storeId}/sales/${saleId}/returns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refundMethod,
          refundAmount: amount,
          notes: notes.trim() || undefined,
          items: selectedItems.map((item) => ({
            saleItemId: item.id,
            quantity: itemStates[item.id].quantity,
            restockItem: itemStates[item.id].restockItem,
          })),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al procesar la devolución')
      }

      toast.success('Devolución procesada correctamente')
      onOpenChange(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar la devolución')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <RotateCcw className="h-5 w-5 text-amber-500" />
            Procesar Devolución
          </DialogTitle>
          <DialogDescription>
            Seleccione los artículos a devolver, las cantidades y si se repone el stock.
          </DialogDescription>
        </DialogHeader>

        {productItems.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No hay artículos de producto disponibles para devolver.
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Items table */}
            <div className="border border-border/60 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/40">
                    <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground w-8"></th>
                    <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Producto</th>
                    <th className="py-3 px-4 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cant.</th>
                    <th className="py-3 px-4 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">P. Unit.</th>
                    <th className="py-3 px-4 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reponer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {productItems.map((item) => {
                    const state = itemStates[item.id]
                    const maxQty = item.quantity - item.alreadyReturned
                    return (
                      <tr key={item.id} className={`transition-colors ${state.selected ? 'bg-amber-500/5' : ''}`}>
                        <td className="py-3 px-4">
                          <Checkbox
                            checked={state.selected}
                            onCheckedChange={(checked) =>
                              updateItemState(item.id, { selected: !!checked })
                            }
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold tracking-tight">{item.productName}</span>
                            {item.productSku && (
                              <span className="text-[10px] text-muted-foreground uppercase tracking-tighter font-bold">
                                {item.productSku}
                              </span>
                            )}
                            {item.alreadyReturned > 0 && (
                              <Badge variant="secondary" className="mt-1 w-fit text-[9px] font-black bg-amber-500/10 text-amber-600 border-none">
                                {item.alreadyReturned} ya devuelto
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Input
                            type="number"
                            min={1}
                            max={maxQty}
                            value={state.quantity}
                            disabled={!state.selected}
                            onChange={(e) => {
                              const v = Math.max(1, Math.min(maxQty, parseInt(e.target.value) || 1))
                              updateItemState(item.id, { quantity: v })
                            }}
                            className="w-16 h-8 text-center text-sm font-bold rounded-lg mx-auto"
                          />
                        </td>
                        <td className="py-3 px-4 text-right font-black text-sm">
                          ${Number(item.unitPrice).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={state.restockItem}
                              disabled={!state.selected}
                              onCheckedChange={(checked) =>
                                updateItemState(item.id, { restockItem: !!checked })
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Restock legend */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <PackageCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>La columna "Reponer" indica si el stock del producto se restituye al inventario.</span>
            </div>

            {/* Refund details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Método de Reembolso
                </Label>
                <Select value={refundMethod} onValueChange={setRefundMethod}>
                  <SelectTrigger className="h-11 rounded-xl border-border font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(refundMethodLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value} className="font-semibold">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Monto a Reembolsar
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">$</span>
                  <Input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={displayRefundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="h-11 rounded-xl pl-7 font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Notas (opcional)
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Motivo de la devolución, observaciones..."
                className="rounded-xl resize-none font-medium text-sm"
                rows={3}
              />
            </div>

            {/* Summary */}
            {selectedItems.length > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
                <span className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                  {selectedItems.length} artículo{selectedItems.length > 1 ? 's' : ''} seleccionado{selectedItems.length > 1 ? 's' : ''}
                </span>
                <span className="text-lg font-black text-amber-700 dark:text-amber-400">
                  ${parseFloat(displayRefundAmount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-bold"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || selectedItems.length === 0}
            className="rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20"
          >
            {loading ? 'Procesando...' : 'Confirmar Devolución'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
