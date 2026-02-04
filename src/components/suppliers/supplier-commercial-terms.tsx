'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  Clock,
  DollarSign,
  Package,
  Truck,
  TrendingDown,
  AlertCircle,
  Edit2,
  Calendar,
} from 'lucide-react'

interface VolumeDiscount {
  id: string
  minQuantity: number
  discountPercentage: number
}

interface CommercialTerms {
  id: string
  paymentTermsDays?: number
  paymentMethod?: string
  earlyPaymentDiscount?: number
  earlyPaymentDays?: number
  minimumPurchaseAmount?: number
  minimumPurchaseQuantity?: number
  leadTimeDays?: number
  deliveryFrequency?: string
  currency: string
  creditLimit?: number
  notes?: string
  volumeDiscounts?: VolumeDiscount[]
}

interface SupplierCommercialTermsProps {
  supplierId: string
  initialTerms: CommercialTerms | null
  storeId: string
}

const PAYMENT_METHODS: Record<string, string> = {
  TRANSFER: 'Transferencia Bancaria',
  CHECK: 'Cheque',
  CASH: 'Efectivo',
  CREDIT_CARD: 'Tarjeta de Crédito',
}

const DELIVERY_FREQUENCIES: Record<string, string> = {
  DAILY: 'Diaria',
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
}

export function SupplierCommercialTerms({
  supplierId,
  initialTerms,
  storeId,
}: SupplierCommercialTermsProps) {
  const [terms] = useState<CommercialTerms | null>(initialTerms)

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  const hasTerms = !!terms

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Términos Comerciales</h3>
          <p className="text-sm text-muted-foreground">
            Condiciones pactadas con el proveedor
          </p>
        </div>
        {hasTerms && (
          <Button>
            <Edit2 className="mr-2 h-4 w-4" />
            Editar Términos
          </Button>
        )}
      </div>

      {!hasTerms ? (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="text-lg font-semibold mb-2">No hay términos configurados</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Define las condiciones comerciales pactadas con este proveedor
            </p>
            <Button>
              <Edit2 className="mr-2 h-4 w-4" />
              Configurar Términos
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Payment Terms */}
          <Card style={{ borderColor: 'var(--color-primary)' }}>
            <CardHeader>
              <CardTitle>Condiciones de Pago</CardTitle>
              <CardDescription>Plazos y métodos de pago acordados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {terms.paymentTermsDays && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Plazo de Pago</p>
                      <p className="text-lg font-semibold">{terms.paymentTermsDays} días</p>
                    </div>
                  </div>
                )}

                {terms.paymentMethod && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Método de Pago</p>
                      <p className="text-lg font-semibold">
                        {PAYMENT_METHODS[terms.paymentMethod] || terms.paymentMethod}
                      </p>
                    </div>
                  </div>
                )}

                {terms.earlyPaymentDiscount && terms.earlyPaymentDays && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                      <TrendingDown className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Descuento por Pronto Pago</p>
                      <p className="text-lg font-semibold">
                        {terms.earlyPaymentDiscount}% en {terms.earlyPaymentDays} días
                      </p>
                    </div>
                  </div>
                )}

                {terms.creditLimit && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Límite de Crédito</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(Number(terms.creditLimit), terms.currency)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Purchase Conditions */}
          <Card style={{ borderColor: 'var(--color-primary)' }}>
            <CardHeader>
              <CardTitle>Condiciones de Compra</CardTitle>
              <CardDescription>Requisitos mínimos para pedidos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {terms.minimumPurchaseAmount && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Compra Mínima (Monto)</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(Number(terms.minimumPurchaseAmount), terms.currency)}
                      </p>
                    </div>
                  </div>
                )}

                {terms.minimumPurchaseQuantity && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Compra Mínima (Cantidad)</p>
                      <p className="text-lg font-semibold">
                        {terms.minimumPurchaseQuantity} unidades
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Terms */}
          <Card style={{ borderColor: 'var(--color-primary)' }}>
            <CardHeader>
              <CardTitle>Condiciones de Entrega</CardTitle>
              <CardDescription>Tiempos y frecuencia de entregas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {terms.leadTimeDays && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tiempo de Entrega</p>
                      <p className="text-lg font-semibold">{terms.leadTimeDays} días</p>
                    </div>
                  </div>
                )}

                {terms.deliveryFrequency && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Frecuencia de Entrega</p>
                      <p className="text-lg font-semibold">
                        {DELIVERY_FREQUENCIES[terms.deliveryFrequency] || terms.deliveryFrequency}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Volume Discounts */}
          {terms.volumeDiscounts && terms.volumeDiscounts.length > 0 && (
            <Card style={{ borderColor: 'var(--color-primary)' }}>
              <CardHeader>
                <CardTitle>Descuentos por Volumen</CardTitle>
                <CardDescription>
                  Descuentos aplicables según cantidad de compra
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {terms.volumeDiscounts.map((discount) => (
                    <div
                      key={discount.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <TrendingDown className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            A partir de {discount.minQuantity} unidades
                          </p>
                        </div>
                      </div>
                      <Badge variant="default" className="text-base px-3 py-1">
                        {discount.discountPercentage}% OFF
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {terms.notes && (
            <Card style={{ borderColor: 'var(--color-primary)' }}>
              <CardHeader>
                <CardTitle>Notas Adicionales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {terms.notes}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Stats */}
          <Card style={{ borderColor: 'var(--color-primary)' }}>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground mb-1">Moneda</p>
                  <p className="text-2xl font-bold">{terms.currency}</p>
                </div>
                {terms.paymentTermsDays && (
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground mb-1">Días de Crédito</p>
                    <p className="text-2xl font-bold">{terms.paymentTermsDays}</p>
                  </div>
                )}
                {terms.leadTimeDays && (
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground mb-1">Días de Entrega</p>
                    <p className="text-2xl font-bold">{terms.leadTimeDays}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
