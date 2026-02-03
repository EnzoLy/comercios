'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Product {
  id: string
  name: string
  costPrice: number
  sellingPrice: number
}

interface BulkPriceAdjustmentDialogProps {
  isOpen: boolean
  onClose: () => void
  products: Product[]
  selectedProductIds: Set<string>
  storeId: string
  onSuccess?: () => void
}

interface PricePreview {
  productId: string
  productName: string
  field: 'sellingPrice' | 'costPrice'
  currentValue: number
  newValue: number
  difference: number
}

export function BulkPriceAdjustmentDialog({
  isOpen,
  onClose,
  products,
  selectedProductIds,
  storeId,
  onSuccess,
}: BulkPriceAdjustmentDialogProps) {
  const [adjustmentType, setAdjustmentType] = useState<'percentage' | 'fixed' | 'replace'>('percentage')
  const [targetField, setTargetField] = useState<'sellingPrice' | 'costPrice' | 'both'>('sellingPrice')
  const [adjustmentValue, setAdjustmentValue] = useState<number>(0)
  const [showPreview, setShowPreview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedProducts = products.filter((p) => selectedProductIds.has(p.id))

  const calculatePreview = (): PricePreview[] => {
    const preview: PricePreview[] = []

    selectedProducts.forEach((product) => {
      const sellingPrice = typeof product.sellingPrice === 'number'
        ? product.sellingPrice
        : parseFloat(product.sellingPrice || '0')
      const costPrice = typeof product.costPrice === 'number'
        ? product.costPrice
        : parseFloat(product.costPrice || '0')

      if (targetField === 'sellingPrice' || targetField === 'both') {
        let newValue: number
        switch (adjustmentType) {
          case 'percentage':
            newValue = sellingPrice * (1 + adjustmentValue / 100)
            break
          case 'fixed':
            newValue = sellingPrice + adjustmentValue
            break
          case 'replace':
            newValue = adjustmentValue
            break
        }
        newValue = Math.round(newValue * 100) / 100
        preview.push({
          productId: product.id,
          productName: product.name,
          field: 'sellingPrice',
          currentValue: sellingPrice,
          newValue,
          difference: newValue - sellingPrice,
        })
      }

      if (targetField === 'costPrice' || targetField === 'both') {
        let newValue: number
        switch (adjustmentType) {
          case 'percentage':
            newValue = costPrice * (1 + adjustmentValue / 100)
            break
          case 'fixed':
            newValue = costPrice + adjustmentValue
            break
          case 'replace':
            newValue = adjustmentValue
            break
        }
        newValue = Math.round(newValue * 100) / 100
        preview.push({
          productId: product.id,
          productName: product.name,
          field: 'costPrice',
          currentValue: costPrice,
          newValue,
          difference: newValue - costPrice,
        })
      }
    })

    return preview
  }

  const preview = showPreview ? calculatePreview() : []

  const handlePreview = () => {
    if (adjustmentValue === 0 && adjustmentType !== 'replace') {
      toast.error('El valor no puede ser cero')
      return
    }
    setShowPreview(true)
  }

  const handleApply = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/stores/${storeId}/products/bulk`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: Array.from(selectedProductIds),
          adjustmentType,
          targetField,
          adjustmentValue,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Error al ajustar precios')
        return
      }

      toast.success(
        `Precios actualizados exitosamente: ${result.updated} productos`
      )
      onSuccess?.()
      onClose()
    } catch (error) {
      toast.error('Ocurrió un error. Por favor intenta de nuevo.')
      console.error('Bulk price adjustment error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setAdjustmentType('percentage')
    setTargetField('sellingPrice')
    setAdjustmentValue(0)
    setShowPreview(false)
    onClose()
  }

  const getAdjustmentTypeLabel = () => {
    switch (adjustmentType) {
      case 'percentage':
        return 'Porcentaje'
      case 'fixed':
        return 'Valor Fijo'
      case 'replace':
        return 'Reemplazo'
    }
  }

  const getTargetFieldLabel = () => {
    switch (targetField) {
      case 'sellingPrice':
        return 'Precio de Venta'
      case 'costPrice':
        return 'Precio de Costo'
      case 'both':
        return 'Ambos Precios'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Ajuste Masivo de Precios</DialogTitle>
          <DialogDescription>
            {selectedProducts.length} producto{selectedProducts.length !== 1 ? 's' : ''} seleccionado
            {selectedProducts.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-6">
          {/* Adjustment Type */}
          <div className="space-y-3">
            <Label>Tipo de Ajuste</Label>
            <RadioGroup value={adjustmentType} onValueChange={(v: any) => setAdjustmentType(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentage" id="percentage" />
                <Label htmlFor="percentage" className="cursor-pointer">
                  Porcentaje (%)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="fixed" />
                <Label htmlFor="fixed" className="cursor-pointer">
                  Valor Fijo (+/-)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="replace" id="replace" />
                <Label htmlFor="replace" className="cursor-pointer">
                  Reemplazo (=)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Target Field */}
          <div className="space-y-3">
            <Label>Campo a Ajustar</Label>
            <RadioGroup value={targetField} onValueChange={(v: any) => setTargetField(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sellingPrice" id="sellingPrice" />
                <Label htmlFor="sellingPrice" className="cursor-pointer">
                  Precio de Venta
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="costPrice" id="costPrice" />
                <Label htmlFor="costPrice" className="cursor-pointer">
                  Precio de Costo
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both" className="cursor-pointer">
                  Ambos
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Adjustment Value */}
          <div className="space-y-2">
            <Label htmlFor="adjustmentValue">
              Valor del Ajuste
              {adjustmentType === 'percentage' && ' (%)'}
              {adjustmentType === 'fixed' && ' (+/-)'}
              {adjustmentType === 'replace' && ' (=)'}
            </Label>
            <Input
              id="adjustmentValue"
              type="number"
              step="0.01"
              placeholder={
                adjustmentType === 'percentage'
                  ? 'Ej: 10 para +10%, -5 para -5%'
                  : adjustmentType === 'fixed'
                  ? 'Ej: 5.00'
                  : 'Ej: 99.99'
              }
              value={adjustmentValue || ''}
              onChange={(e) => setAdjustmentValue(parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Preview Section */}
          {showPreview && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Vista Previa</h3>
                <span className="text-sm text-gray-600">
                  {getAdjustmentTypeLabel()} en {getTargetFieldLabel()}
                </span>
              </div>

              <div className="border rounded-md overflow-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Campo</TableHead>
                      <TableHead className="text-right">Valor Actual</TableHead>
                      <TableHead className="text-right">Nuevo Valor</TableHead>
                      <TableHead className="text-right">Diferencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((item, index) => {
                      const isIncrease = item.difference > 0
                      const isDecrease = item.difference < 0
                      const isNoChange = item.difference === 0

                      return (
                        <TableRow key={`${item.productId}-${item.field}-${index}`}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell>
                            {item.field === 'sellingPrice' ? 'Venta' : 'Costo'}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.currentValue)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.newValue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {isNoChange ? (
                              <span className="flex items-center justify-end gap-1 text-gray-500">
                                <Minus className="h-3 w-3" />
                                $0,00
                              </span>
                            ) : isIncrease ? (
                              <span className="flex items-center justify-end gap-1 text-green-600">
                                <TrendingUp className="h-3 w-3" />
                                +{formatCurrency(item.difference)}
                              </span>
                            ) : (
                              <span className="flex items-center justify-end gap-1 text-red-600">
                                <TrendingDown className="h-3 w-3" />
                                {formatCurrency(Math.abs(typeof item.difference === 'number' ? item.difference : parseFloat(item.difference || '0')))}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          {!showPreview ? (
            <Button onClick={handlePreview} disabled={adjustmentValue === 0 && adjustmentType !== 'replace'}>
              Ver Preview
            </Button>
          ) : (
            <Button onClick={handleApply} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar y Aplicar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
