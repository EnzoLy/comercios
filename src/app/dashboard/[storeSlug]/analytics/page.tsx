'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useStore } from '@/hooks/use-store'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  BarChart3,
  TrendingUp,
  Users,
  Package,
  FolderTree,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricDisplay } from '@/components/analytics/shared/MetricDisplay'
import { DateRangeSelector } from '@/components/analytics/shared/DateRangeSelector'
import { LoadingState } from '@/components/analytics/shared/LoadingState'
import { EmptyState } from '@/components/analytics/shared/EmptyState'
import { formatCurrency, formatNumber } from '@/lib/analytics/chart-utils'

interface OverviewData {
  totalRevenue: string
  totalTransactions: number
  avgTransaction: string
  topEmployee: {
    employeeId: string
    employeeName: string
    transactions: number
    revenue: string
  } | null
  topProduct: {
    productId: string
    productName: string
    quantitySold: number
    revenue: string
    marginPercentage: string
  } | null
}

export default function AnalyticsHub() {
  const params = useParams()
  const storeSlug = params.storeSlug as string
  const store = useStore()

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [overview, setOverview] = useState<OverviewData | null>(null)

  // Initialize date range (last 30 days)
  useEffect(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    setEndDate(now.toISOString().split('T')[0])
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0])
  }, [])

  // Fetch overview data
  useEffect(() => {
    if (!startDate || !endDate || !store) return

    const fetchOverview = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/stores/${store.storeId}/analytics/overview?startDate=${startDate}&endDate=${endDate}`
        )

        if (!response.ok) {
          const errorData = await response.json()
          console.error('API Error:', errorData)
          throw new Error(errorData.error || 'Failed to fetch overview data')
        }

        const result = await response.json()
        setOverview(result.data)
      } catch (error) {
        console.error('Error fetching overview:', error)
        toast.error('Failed to load overview data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOverview()
  }, [startDate, endDate, store])

  const handleDateChange = (newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate)
    setEndDate(newEndDate)
  }

  const analyticsLinks = [
    {
      title: 'Ventas por Fecha',
      description: 'Ver tendencias de ventas diarias o mensuales',
      icon: TrendingUp,
      href: `/dashboard/${storeSlug}/analytics/sales-by-date`,
      colorVar: '--color-primary',
    },
    {
      title: 'Desempeño de Empleados',
      description: 'Seguimiento de ventas por empleado/cajero',
      icon: Users,
      href: `/dashboard/${storeSlug}/analytics/employees`,
      colorVar: '--color-secondary',
    },
    {
      title: 'Analítica de Productos',
      description: 'Analizar ventas de productos y márgenes',
      icon: Package,
      href: `/dashboard/${storeSlug}/analytics/products`,
      colorVar: '--color-accent',
    },
    {
      title: 'Análisis por Categoría',
      description: 'Ver ventas por categoría de producto',
      icon: FolderTree,
      href: `/dashboard/${storeSlug}/analytics/categories`,
      colorVar: '--color-primary',
    },
  ]

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analíticas</h1>
        <p className="text-muted-foreground mt-2">
          Explora métricas de ventas detalladas y análisis de rendimiento
        </p>
      </div>

      {/* Date Range Selector */}
      <DateRangeSelector startDate={startDate} endDate={endDate} onDateChange={handleDateChange} />

      {/* Summary Metrics */}
      {isLoading ? (
        <LoadingState type="card" count={4} />
      ) : !overview ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricDisplay
            title="Ingresos Totales"
            value={overview.totalRevenue}
            icon={<BarChart3 className="h-8 w-8" />}
            format="currency"
          />
          <MetricDisplay
            title="Transacciones"
            value={overview.totalTransactions}
            icon="📊"
            format="number"
          />
          <MetricDisplay
            title="Transacción Promedio"
            value={overview.avgTransaction}
            icon="💰"
            format="currency"
          />
          <MetricDisplay
            title="Mejor Empleado"
            value={overview.topEmployee?.employeeName || 'N/A'}
            description={
              overview.topEmployee
                ? `${formatCurrency(overview.topEmployee.revenue)}`
                : 'Sin ventas'
            }
            icon="👤"
            format="none"
            highlight={true}
          />
        </div>
      )}

      {/* Analytics Links Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Explorar Analíticas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analyticsLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link key={link.href} href={link.href}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer" style={{ borderColor: `var(${link.colorVar})` }}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Icon className="h-5 w-5" style={{ color: `var(${link.colorVar})` }} />
                          {link.title}
                        </CardTitle>
                        <CardDescription>{link.description}</CardDescription>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Top Product Section */}
      {!isLoading && overview?.topProduct && (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader>
            <CardTitle>Mejor Producto en Este Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Producto</p>
                <p className="text-lg font-semibold">{overview.topProduct.productName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unidades Vendidas</p>
                <p className="text-lg font-semibold">{overview.topProduct.quantitySold}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ingresos</p>
                <p className="text-lg font-semibold">{formatCurrency(overview.topProduct.revenue)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Margen de Ganancia</p>
                <p className="text-lg font-semibold" style={{ color: 'var(--color-primary)' }}>
                  {overview.topProduct.marginPercentage}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
