'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/utils/currency'
import { toast } from 'sonner'
import { AlertCircle, CheckCircle } from 'lucide-react'

interface ShiftReportDialogProps {
  storeId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  openingCash?: number
  shiftStartTime?: Date
}

interface ShiftReport {
  openingCash: number
  totalCashSales: number
  expectedCash: number
  actualCash: number
  variance: number
  variancePercentage: number
  notes: string
}

export function ShiftReportDialog({
  storeId,
  isOpen,
  onOpenChange,
  openingCash = 0,
  shiftStartTime,
}: ShiftReportDialogProps) {
  const [actualCash, setActualCash] = useState('')
  const [notes, setNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [report, setReport] = useState<ShiftReport | null>(null)

  const handleSubmit = async () => {
    if (!actualCash || Number(actualCash) < 0) {
      toast.error('Ingresa un monto válido')
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/stores/${storeId}/pos/shift-close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualCash: Number(actualCash),
          notes,
          openingCash,
          shiftStartTime,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Error al cerrar el turno')
        return
      }

      setReport(data)
      toast.success('Turno cerrado exitosamente')
    } catch (error) {
      console.error('Error closing shift:', error)
      toast.error('Error al cerrar el turno')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    if (report) {
      // Reset form after successful submission
      setActualCash('')
      setNotes('')
      setReport(null)
    }
    onOpenChange(false)
  }

  if (report) {
    const isVarianceWithinTolerance = Math.abs(report.variance) <= 0.5
    const varianceColor = isVarianceWithinTolerance ? 'green' : 'red'

    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isVarianceWithinTolerance ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              Reporte de Cierre
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Dinero Inicial:
                </span>
                <span className="font-semibold">
                  {formatCurrency(report.openingCash)}
                </span>
              </div>

              <div className="flex justify-between text-sm border-t pt-3">
                <span className="text-gray-600 dark:text-gray-400">
                  Ventas en Efectivo:
                </span>
                <span className="font-semibold">
                  {formatCurrency(report.totalCashSales)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Efectivo Esperado:
                </span>
                <span className="font-semibold">
                  {formatCurrency(report.expectedCash)}
                </span>
              </div>

              <div className="flex justify-between text-sm border-t pt-3">
                <span className="text-gray-600 dark:text-gray-400">
                  Efectivo Contado:
                </span>
                <span className="font-semibold">
                  {formatCurrency(report.actualCash)}
                </span>
              </div>

              <div
                className={`flex justify-between text-sm border-t pt-3 ${
                  varianceColor === 'green' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                <span>Diferencia:</span>
                <span className="font-bold">
                  {report.variance >= 0 ? '+' : ''}
                  {formatCurrency(report.variance)} ({report.variancePercentage.toFixed(2)}%)
                </span>
              </div>
            </div>

            {report.notes && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Notas:
                </p>
                <p className="text-sm">{report.notes}</p>
              </div>
            )}

            {!isVarianceWithinTolerance && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ Hay una diferencia de {formatCurrency(Math.abs(report.variance))}.
                  Por favor verifica el conteo.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleClose} className="w-full">
              Aceptar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cerrar Turno</DialogTitle>
          <DialogDescription>
            Ingresa el efectivo contado para reconciliar la caja
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Dinero Inicial
            </p>
            <p className="text-lg font-bold">
              {formatCurrency(openingCash || 0)}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Efectivo Contado</Label>
            <Input
              type="number"
              step="0.01"
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              placeholder="0.00"
              disabled={isProcessing}
              min="0"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Notas (Opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder="Ej: Diferencia debido a..."
              disabled={isProcessing}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isProcessing || !actualCash}
          >
            {isProcessing ? 'Procesando...' : 'Cerrar Turno'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
