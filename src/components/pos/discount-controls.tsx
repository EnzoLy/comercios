'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { formatCurrency } from '@/lib/utils/currency'
import { Percent, DollarSign } from 'lucide-react'

interface DiscountControlsProps {
  cartTotal: number
  currentDiscount: number
  onDiscountChange: (discount: number) => void
}

export function DiscountControls({
  cartTotal,
  currentDiscount,
  onDiscountChange,
}: DiscountControlsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState(currentDiscount > 0 ? String(currentDiscount) : '')

  const percentageOptions = [5, 10, 15, 20]
  const [selectedPercentage, setSelectedPercentage] = useState<number | null>(null)

  const handleQuickDiscount = (percentage: number) => {
    const discountAmount = (cartTotal * percentage) / 100
    setSelectedPercentage(percentage)
    setDiscountValue(String(percentage))
    setDiscountType('percentage')
    onDiscountChange(Math.round(discountAmount * 100) / 100)
    setIsOpen(false)
  }

  const handleCustomDiscount = () => {
    const value = parseFloat(discountValue) || 0
    if (discountType === 'percentage') {
      const discountAmount = (cartTotal * value) / 100
      onDiscountChange(Math.round(discountAmount * 100) / 100)
    } else {
      onDiscountChange(Math.min(value, cartTotal))
    }
    setIsOpen(false)
  }

  const handleClearDiscount = () => {
    onDiscountChange(0)
    setDiscountValue('')
    setIsOpen(false)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={currentDiscount > 0 ? 'border-yellow-500 text-yellow-600' : ''}
      >
        {currentDiscount > 0 ? (
          <>
            Descuento: {formatCurrency(currentDiscount)}
          </>
        ) : (
          'Agregar Descuento'
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Descuento</DialogTitle>
            <DialogDescription>
              Total: {formatCurrency(cartTotal)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Quick Discount Buttons */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Descuento Rápido</Label>
              <div className="grid grid-cols-4 gap-2">
                {percentageOptions.map((percentage) => (
                  <Button
                    key={percentage}
                    variant={selectedPercentage === percentage ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleQuickDiscount(percentage)}
                    className={selectedPercentage === percentage ? "bg-primary text-primary-foreground" : ""}
                  >
                    {percentage}%
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Discount */}
            <div className="space-y-3 border-t pt-4">
              <Label className="text-sm font-medium">Descuento Personalizado</Label>

              <Select value={discountType} onValueChange={(value: any) => setDiscountType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                  <SelectItem value="fixed">Cantidad Fija</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'percentage' ? '0' : '0.00'}
                  min="0"
                  max={discountType === 'percentage' ? '100' : String(cartTotal)}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {discountType === 'percentage' ? (
                    <Percent className="h-4 w-4" />
                  ) : (
                    <DollarSign className="h-4 w-4" />
                  )}
                </div>
              </div>

              {discountValue && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {discountType === 'percentage'
                      ? `Descuento: ${formatCurrency((cartTotal * Number(discountValue)) / 100)}`
                      : `Descuento: ${formatCurrency(Number(discountValue))}`}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 border-t pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleClearDiscount}
              >
                Limpiar
              </Button>
              <Button
                className="flex-1"
                onClick={handleCustomDiscount}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
