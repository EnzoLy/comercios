'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Supplier } from '@/lib/db/entities/supplier.entity'
import type { SupplierCommercialTerms as CommercialTermsEntity } from '@/lib/db/entities/supplier-commercial-terms.entity'
import {
  Package,
  DollarSign,
  TrendingUp,
  Calendar,
  Clock,
  CreditCard,
  Truck,
  AlertCircle,
  FileText,
} from 'lucide-react'

interface SupplierSummaryProps {
  supplier: Supplier & {
    contacts?: any[]
    supplierProducts?: any[]
    documents?: any[]
    deliverySchedules?: any[]
  }
  commercialTerms: CommercialTermsEntity | null
  storeId: string
  storeSlug: string
}

interface RecentActivity {
  id: string
  type: 'price_change' | 'purchase_order' | 'document'
  description: string
  date: Date
  metadata?: any
}

export function SupplierSummary({ supplier, commercialTerms, storeId, storeSlug }: SupplierSummaryProps) {
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalPurchaseOrders: 0,
    totalSpent: 0,
  })

  useEffect(() => {
    // Calculate stats
    const activeProducts = supplier.supplierProducts?.filter((sp) => sp.isActive).length || 0
    setStats({
      totalProducts: supplier.supplierProducts?.length || 0,
      activeProducts,
      totalPurchaseOrders: 0, // TODO: Fetch from purchase orders
      totalSpent: 0, // TODO: Calculate from purchase orders
    })

    // TODO: Fetch recent activity from API
    // For now, show placeholder
    setRecentActivity([])
  }, [supplier])

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date))
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Productos</CardDescription>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">{stats.totalProducts}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.activeProducts} activos
            </p>
          </CardContent>
        </Card>

        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Órdenes de Compra</CardDescription>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">{stats.totalPurchaseOrders}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Total histórico</p>
          </CardContent>
        </Card>

        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Total Gastado</CardDescription>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">
              {formatCurrency(stats.totalSpent, supplier.currency)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Histórico total</p>
          </CardContent>
        </Card>

        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Documentos</CardDescription>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">{supplier.documents?.length || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {supplier.documents?.filter((d) => d.isActive).length || 0} activos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Information */}
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader>
            <CardTitle>Información Clave</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {supplier.address && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Truck className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Dirección</p>
                  <p className="text-sm text-muted-foreground">
                    {supplier.address}
                    {supplier.city && `, ${supplier.city}`}
                    {supplier.state && `, ${supplier.state}`}
                    {supplier.zipCode && ` ${supplier.zipCode}`}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Moneda</p>
                <p className="text-sm text-muted-foreground">{supplier.currency}</p>
              </div>
            </div>

            {supplier.contacts && supplier.contacts.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Contactos</p>
                  <p className="text-sm text-muted-foreground">
                    {supplier.contacts.length} contacto{supplier.contacts.length !== 1 ? 's' : ''} registrado
                    {supplier.contacts.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Fecha de Registro</p>
                <p className="text-sm text-muted-foreground">{formatDate(supplier.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commercial Terms Summary */}
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader>
            <CardTitle>Términos Comerciales</CardTitle>
            <CardDescription>
              {commercialTerms ? 'Resumen de condiciones pactadas' : 'No configurados'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {commercialTerms ? (
              <>
                {commercialTerms.paymentTermsDays && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Plazo de Pago</p>
                      <p className="text-sm text-muted-foreground">
                        {commercialTerms.paymentTermsDays} días
                      </p>
                    </div>
                  </div>
                )}

                {commercialTerms.leadTimeDays && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Tiempo de Entrega</p>
                      <p className="text-sm text-muted-foreground">
                        {commercialTerms.leadTimeDays} días
                      </p>
                    </div>
                  </div>
                )}

                {commercialTerms.minimumPurchaseAmount && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <DollarSign className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Compra Mínima</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(
                          Number(commercialTerms.minimumPurchaseAmount),
                          commercialTerms.currency
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {commercialTerms.deliveryFrequency && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Truck className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Frecuencia de Entrega</p>
                      <p className="text-sm text-muted-foreground">
                        {commercialTerms.deliveryFrequency}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-3 text-muted-foreground py-4">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm">
                  No se han configurado términos comerciales para este proveedor.
                  Configúralos en la pestaña de Términos Comerciales.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card style={{ borderColor: 'var(--color-primary)' }}>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>Últimas 10 actividades relacionadas con este proveedor</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {activity.type === 'price_change' && <TrendingUp className="h-4 w-4 text-primary" />}
                    {activity.type === 'purchase_order' && <FileText className="h-4 w-4 text-primary" />}
                    {activity.type === 'document' && <FileText className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(activity.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No hay actividad reciente</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {supplier.notes && (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{supplier.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
