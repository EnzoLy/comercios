'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useStore } from '@/hooks/use-store'
import { Loader2, AlertTriangle, Calendar } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface BulkExpirationToggleDialogProps {
  isOpen: boolean
  onClose: () => void
  selectedProductIds: string[]
  selectedProducts: Array<{ id: string; name: string; currentStock: number }>
}

export function BulkExpirationToggleDialog({
  isOpen,
  onClose,
  selectedProductIds,
  selectedProducts,
}: BulkExpirationToggleDialogProps) {
  const router = useRouter()
  const store = useStore()
  const [isLoading, setIsLoading] = useState(false)
  const [trackExpirationDates, setTrackExpirationDates] = useState(true)

  const productsWithStock = selectedProducts.filter((p) => p.currentStock > 0)
  const hasProductsWithStock = productsWithStock.length > 0

  const onSubmit = async () => {
    if (!store) {
      toast.error('Store context not found')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/stores/${store.storeId}/products/bulk-expiration`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productIds: selectedProductIds,
            trackExpirationDates,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Error al actualizar productos')
        return
      }

      if (result.warning && result.productsWithStock?.length > 0) {
        toast.warning(
          `${result.updatedCount} productos actualizados. ${result.productsWithStock.length} requieren ajuste manual de lotes.`,
          { duration: 6000 }
        )
      } else {
        toast.success(`${result.updatedCount} productos actualizados exitosamente`)
      }

      onClose()
      router.refresh()
    } catch (error) {
      toast.error('Ocurrió un error. Por favor intenta de nuevo.')
      console.error('Bulk expiration toggle error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Configurar Seguimiento de Vencimientos
          </DialogTitle>
          <DialogDescription>
            Activa o desactiva el seguimiento de fechas de vencimiento para{' '}
            {selectedProductIds.length} producto(s) seleccionado(s).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-2 p-4 border rounded-lg">
            <Checkbox
              id="trackExpirationDates"
              checked={trackExpirationDates}
              onCheckedChange={(checked) => setTrackExpirationDates(checked as boolean)}
              disabled={isLoading}
            />
            <Label htmlFor="trackExpirationDates" className="cursor-pointer font-medium">
              Activar seguimiento de fechas de vencimiento
            </Label>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            El seguimiento de vencimientos permite gestionar lotes de productos perecederos
            como alimentos, medicinas o cosméticos. El sistema aplicará automáticamente FEFO
            (First Expired, First Out) en las ventas.
          </p>

          {trackExpirationDates && hasProductsWithStock && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Atención: Productos con Stock Actual</AlertTitle>
              <AlertDescription>
                <p className="mb-2">
                  {productsWithStock.length} de los productos seleccionados tienen stock
                  actual y requerirán ajuste manual de lotes:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {productsWithStock.slice(0, 5).map((p) => (
                    <li key={p.id}>
                      <strong>{p.name}</strong> - {p.currentStock} unidades
                    </li>
                  ))}
                  {productsWithStock.length > 5 && (
                    <li className="text-gray-500">
                      ...y {productsWithStock.length - 5} producto(s) más
                    </li>
                  )}
                </ul>
                <p className="mt-3 font-medium">
                  Después de activar el tracking, deberás ir a{' '}
                  <strong>Inventario → Gestión de Lotes</strong> para crear lotes manualmente
                  con las fechas de vencimiento correspondientes.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {!trackExpirationDates && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Desactivar Seguimiento</AlertTitle>
              <AlertDescription>
                Al desactivar el seguimiento de vencimientos, los lotes existentes se
                mantendrán en la base de datos pero no se usarán en las ventas. El sistema
                volverá a usar el stock agregado.
              </AlertDescription>
            </Alert>
          )}
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
          <Button onClick={onSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {trackExpirationDates ? 'Activar Seguimiento' : 'Desactivar Seguimiento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
