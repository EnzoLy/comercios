'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface PriceAlert {
  id: string
  productId: string
  productName: string
  productSku: string
  supplierId: string
  supplierName: string
  currentPrice: number
  previousPrice: number | null
  currency: string
  changePercentage: number | null
  effectiveDate: Date
  createdAt: Date
}

interface PriceAlertsWidgetProps {
  storeId: string
  storeSlug: string
  limit?: number
}

export function PriceAlertsWidget({ storeId, storeSlug, limit = 5 }: PriceAlertsWidgetProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch(
          `/api/stores/${storeId}/suppliers/analytics/price-alerts?limit=${limit}`
        )
        if (response.ok) {
          const data = await response.json()
          setAlerts(data.alerts || [])
        }
      } catch (error) {
        console.error('Error fetching price alerts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [storeId, limit])

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(date))
  }

  const getAlertBadgeVariant = (changePercent: number | null) => {
    if (!changePercent) return 'secondary'
    if (changePercent >= 10) return 'destructive'
    if (changePercent >= 5) return 'secondary'
    return 'secondary'
  }

  const getAlertBadgeColor = (changePercent: number | null) => {
    if (!changePercent) return ''
    if (changePercent >= 10) return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
    if (changePercent >= 5) return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
  }

  if (loading) {
    return null // Don't show widget while loading
  }

  if (alerts.length === 0) {
    return null // Don't show widget if no alerts
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <CardTitle>Alertas de Precios</CardTitle>
          </div>
          {alerts.length > 0 && (
            <Badge variant="destructive">{alerts.length}</Badge>
          )}
        </div>
        <CardDescription>Cambios recientes en precios de proveedores</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm truncate">{alert.productName}</p>
                  {alert.changePercentage !== null && (
                    <Badge
                      variant="secondary"
                      className={getAlertBadgeColor(alert.changePercentage)}
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +{alert.changePercentage.toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-1">
                  {alert.supplierName}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  {alert.previousPrice !== null && (
                    <>
                      <span className="text-muted-foreground line-through">
                        {formatCurrency(alert.previousPrice, alert.currency)}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </>
                  )}
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    {formatCurrency(alert.currentPrice, alert.currency)}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <p className="text-xs text-muted-foreground">
                  {formatDate(alert.effectiveDate)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Button asChild className="w-full mt-4" variant="outline">
          <Link href={`/dashboard/${storeSlug}/suppliers/price-alerts`}>
            Ver Todas las Alertas
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
