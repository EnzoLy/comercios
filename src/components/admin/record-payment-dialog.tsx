'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { recordPaymentSchema, type RecordPaymentInput } from '@/lib/validations/subscription.schema'
import { Loader2, DollarSign } from 'lucide-react'

interface RecordPaymentDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  storeId: string
  storeName: string
}

export function RecordPaymentDialog({
  isOpen,
  onOpenChange,
  onSuccess,
  storeId,
  storeName,
}: RecordPaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPermanent, setIsPermanent] = useState(false)

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<RecordPaymentInput>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: {
      storeId,
      currency: 'USD',
      paymentMethod: 'BANK_TRANSFER',
      paymentDate: new Date().toISOString().split('T')[0],
      isPermanent: false,
      durationMonths: 1,
    },
  })

  const onSubmit = async (data: RecordPaymentInput) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/admin/subscriptions/record-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || 'Error al registrar pago')
        return
      }

      toast.success('Pago registrado exitosamente')
      reset()
      setIsPermanent(false)
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast.error('Error al registrar pago')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePermanentChange = (checked: boolean) => {
    setIsPermanent(checked)
    setValue('isPermanent', checked)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Registrar Pago de Suscripción
          </DialogTitle>
          <DialogDescription>
            Registrar pago manual para: <strong>{storeName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Monto *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="50.00"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
            </div>

            <div>
              <Label>Moneda</Label>
              <Select defaultValue="USD" onValueChange={(v) => setValue('currency', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="MXN">MXN</SelectItem>
                  <SelectItem value="COP">COP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Método de Pago *</Label>
              <Select defaultValue="BANK_TRANSFER" onValueChange={(v) => setValue('paymentMethod', v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Efectivo</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Transferencia Bancaria</SelectItem>
                  <SelectItem value="CHECK">Cheque</SelectItem>
                  <SelectItem value="CREDIT_CARD">Tarjeta de Crédito</SelectItem>
                  <SelectItem value="DEBIT_CARD">Tarjeta de Débito</SelectItem>
                  <SelectItem value="OTHER">Otro</SelectItem>
                </SelectContent>
              </Select>
              {errors.paymentMethod && <p className="text-sm text-red-500">{errors.paymentMethod.message}</p>}
            </div>

            <div>
              <Label>Fecha de Pago *</Label>
              <Input type="date" {...register('paymentDate')} />
              {errors.paymentDate && <p className="text-sm text-red-500">{errors.paymentDate.message}</p>}
            </div>
          </div>

          <div>
            <Label>Número de Referencia</Label>
            <Input placeholder="Ej: TRX-12345" {...register('referenceNumber')} />
          </div>

          <div className="border rounded-lg p-4 bg-slate-50">
            <div className="flex items-center space-x-2 mb-3">
              <Checkbox
                id="isPermanent"
                checked={isPermanent}
                onCheckedChange={handlePermanentChange}
              />
              <Label
                htmlFor="isPermanent"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Marcar como suscripción permanente (sin fecha de expiración)
              </Label>
            </div>

            {!isPermanent && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Duración (Meses)</Label>
                  <Input
                    type="number"
                    placeholder="12"
                    defaultValue={1}
                    {...register('durationMonths', { valueAsNumber: true })}
                  />
                  {errors.durationMonths && <p className="text-sm text-red-500">{errors.durationMonths.message}</p>}
                </div>

                <div>
                  <Label>Duración (Años)</Label>
                  <Input
                    type="number"
                    placeholder="1"
                    {...register('durationYears', { valueAsNumber: true })}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <Label>Notas (Opcional)</Label>
            <Textarea
              placeholder="Agregar notas adicionales sobre este pago..."
              {...register('notes')}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Pago
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
