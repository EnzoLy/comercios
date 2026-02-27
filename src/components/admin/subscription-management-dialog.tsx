'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { SubscriptionStatusBadge } from './subscription-status-badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Calendar, Infinity, RefreshCw, History, Tag } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Store {
  id: string
  name: string
  subscription: {
    status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'PERMANENT'
    plan?: 'FREE' | 'BASICO' | 'PRO'
    startDate?: Date | null
    endDate?: Date | null
    isPermanent: boolean
    daysRemaining?: number | null
  }
}

interface PaymentHistory {
  id: string
  amount: number
  currency: string
  paymentMethod: string
  referenceNumber?: string
  paymentDate: Date
  durationMonths: number
  periodStartDate: Date
  periodEndDate: Date
  notes?: string
  recordedBy: {
    id: string
    name: string
    email: string
  }
  createdAt: Date
}

export function SubscriptionManagementDialog({
  isOpen,
  onOpenChange,
  onSuccess,
  store,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  store: Store
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [isTogglingPermanent, setIsTogglingPermanent] = useState(false)
  const [isSettingPlan, setIsSettingPlan] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'FREE' | 'BASICO' | 'PRO'>(
    store.subscription.plan ?? 'FREE'
  )
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    durationMonths?: number
    durationYears?: number
  }>()

  useEffect(() => {
    if (isOpen) {
      loadPaymentHistory()
    }
  }, [isOpen, store.id])

  const loadPaymentHistory = async () => {
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/admin/subscriptions/${store.id}/history`)
      if (res.ok) {
        const data = await res.json()
        setPaymentHistory(data)
      }
    } catch (error) {
      console.error('Failed to load payment history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleRenew = async (data: { durationMonths?: number; durationYears?: number }) => {
    if (!data.durationMonths && !data.durationYears) {
      toast.error('Debe especificar una duración en meses o años')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/subscriptions/${store.id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || 'Error al renovar suscripción')
        return
      }

      toast.success('Suscripción renovada exitosamente')
      reset()
      onSuccess()
    } catch (error) {
      toast.error('Error al renovar suscripción')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetPlan = async () => {
    setIsSettingPlan(true)
    try {
      const res = await fetch(`/api/admin/subscriptions/${store.id}/set-plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      })

      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || 'Error al actualizar el plan')
        return
      }

      toast.success(`Plan actualizado a ${selectedPlan}`)
      onSuccess()
    } catch (error) {
      toast.error('Error al actualizar el plan')
    } finally {
      setIsSettingPlan(false)
    }
  }

  const handleTogglePermanent = async () => {
    const newValue = !store.subscription.isPermanent

    setIsTogglingPermanent(true)
    try {
      const res = await fetch(`/api/admin/subscriptions/${store.id}/toggle-permanent`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPermanent: newValue }),
      })

      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || 'Error al actualizar suscripción')
        return
      }

      toast.success(
        newValue
          ? 'Suscripción marcada como permanente'
          : 'Suscripción convertida a temporal'
      )
      onSuccess()
    } catch (error) {
      toast.error('Error al actualizar suscripción')
    } finally {
      setIsTogglingPermanent(false)
    }
  }

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'N/A'
    try {
      return format(new Date(date), 'dd MMM yyyy', { locale: es })
    } catch {
      return 'N/A'
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount)
  }

  const paymentMethodLabels: Record<string, string> = {
    CASH: 'Efectivo',
    BANK_TRANSFER: 'Transferencia',
    CHECK: 'Cheque',
    CREDIT_CARD: 'Tarjeta de Crédito',
    DEBIT_CARD: 'Tarjeta de Débito',
    OTHER: 'Otro',
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[95vh] sm:max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 flex-shrink-0">
          <DialogTitle>Gestionar Suscripción - {store.name}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Estado Actual</h3>
              <div className="mt-1">
                <SubscriptionStatusBadge
                  status={store.subscription.status}
                  daysRemaining={store.subscription.daysRemaining}
                />
              </div>
            </div>

            {store.subscription.endDate && !store.subscription.isPermanent && (
              <div className="sm:text-right">
                <h3 className="text-sm font-medium text-gray-500">Fecha de Expiración</h3>
                <p className="text-lg font-semibold flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(store.subscription.endDate)}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Plan Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border">
            <div>
              <h3 className="font-medium flex items-center gap-2">
                <Tag className="h-5 w-5 text-gray-600" />
                Plan de Suscripción
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Cambiá el plan asignado a esta tienda
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Select
                value={selectedPlan}
                onValueChange={(v) => setSelectedPlan(v as 'FREE' | 'BASICO' | 'PRO')}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">FREE</SelectItem>
                  <SelectItem value="BASICO">BÁSICO</SelectItem>
                  <SelectItem value="PRO">PRO</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleSetPlan}
                disabled={isSettingPlan || selectedPlan === store.subscription.plan}
                size="sm"
              >
                {isSettingPlan && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </div>
          </div>

          <Separator />

          {/* Permanent Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-blue-200">
            <div>
              <h3 className="font-medium flex items-center gap-2">
                <Infinity className="h-5 w-5 text-blue-600" />
                Suscripción Permanente
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {store.subscription.isPermanent
                  ? 'Esta tienda tiene acceso permanente sin fecha de expiración'
                  : 'Marcar esta tienda como permanente elimina la fecha de expiración'}
              </p>
            </div>
            <Button
              variant={store.subscription.isPermanent ? 'outline' : 'default'}
              onClick={handleTogglePermanent}
              disabled={isTogglingPermanent}
              className="shrink-0"
            >
              {isTogglingPermanent && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {store.subscription.isPermanent ? 'Convertir a Temporal' : 'Marcar Permanente'}
            </Button>
          </div>

          {/* Renewal Section */}
          {!store.subscription.isPermanent && (
            <>
              <Separator />
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Renovar Suscripción
                </h3>
                <form onSubmit={handleSubmit(handleRenew)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Duración (Meses)</Label>
                      <Input
                        type="number"
                        placeholder="12"
                        {...register('durationMonths', { valueAsNumber: true })}
                      />
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
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Renovar Suscripción
                  </Button>
                </form>
              </div>
            </>
          )}

          <Separator />

          {/* Payment History */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <History className="h-4 w-4" />
              Historial de Pagos
            </h3>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : paymentHistory.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                No hay pagos registrados
              </p>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden sm:block border rounded-lg overflow-hidden overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Duración</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Registrado por</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentHistory.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(payment.paymentDate)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(payment.amount, payment.currency)}
                          </TableCell>
                          <TableCell>
                            {paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod}
                          </TableCell>
                          <TableCell>
                            {payment.durationMonths >= 12
                              ? `${Math.floor(payment.durationMonths / 12)} año${Math.floor(payment.durationMonths / 12) !== 1 ? 's' : ''}`
                              : `${payment.durationMonths} mes${payment.durationMonths !== 1 ? 'es' : ''}`}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(payment.periodStartDate)} -{' '}
                            {formatDate(payment.periodEndDate)}
                          </TableCell>
                          <TableCell className="text-sm">{payment.recordedBy.name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="sm:hidden space-y-3">
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="text-sm text-gray-500">{formatDate(payment.paymentDate)}</div>
                        <div className="font-semibold text-lg">
                          {formatCurrency(payment.amount, payment.currency)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Método: </span>
                          {paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod}
                        </div>
                        <div>
                          <span className="text-gray-500">Duración: </span>
                          {payment.durationMonths >= 12
                            ? `${Math.floor(payment.durationMonths / 12)} año(s)`
                            : `${payment.durationMonths} mes(es)`}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Período: {formatDate(payment.periodStartDate)} - {formatDate(payment.periodEndDate)}
                      </div>
                      <div className="text-xs text-gray-400">
                        Registrado por: {payment.recordedBy.name}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
