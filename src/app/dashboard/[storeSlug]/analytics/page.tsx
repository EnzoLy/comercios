'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useStore } from '@/hooks/use-store'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  FolderTree,
  ArrowRight,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Target,
  Zap,
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Centro de Análisis</h1>
          <p className="text-muted-foreground mt-2">
            Panel ejecutivo de analítica con resumen de métricas clave y acceso a reportes detallados
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-4 py-2 rounded-xl">
          <Calendar className="h-4 w-4" />
          <span>Últimos 30 días</span>
        </div>
      </div>

      {/* Date Range Selector */}
      <DateRangeSelector startDate={startDate} endDate={endDate} onDateChange={handleDateChange} />

      {/* Main Summary Metrics - Expanded */}
      {isLoading ? (
        <LoadingState type="card" count={8} />
      ) : !overview ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-4">
            <MetricDisplay
              title="Ingresos Totales"
              value={overview.totalRevenue}
              icon="💰"
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
              icon="💵"
              format="currency"
            />
            <MetricDisplay
              title="Mejor Producto"
              value={overview.topProduct?.productName || 'N/A'}
              icon="🏆"
              format="text"
            />
            <MetricDisplay
              title="Top Empleado"
              value={overview.topEmployee?.employeeName || 'N/A'}
              icon="⭐"
              format="text"
            />
            <MetricDisplay
              title="Prod. Vendidos"
              value={overview.topProduct?.quantitySold || 0}
              icon="📦"
              format="number"
            />
            <MetricDisplay
              title="Margen Top"
              value={(overview.topProduct?.marginPercentage || '0') + '%'}
              icon="📈"
              format="text"
            />
            <MetricDisplay
              title="Período"
              value="30 días"
              icon="📅"
              format="text"
            />
          </div>

          {/* Top Items Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Best Product */}
            {overview.topProduct && (
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      🏆 Mejor Producto
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-bold text-lg truncate">{overview.topProduct.productName}</p>
                    <p className="text-2xl font-bold">{formatCurrency(overview.topProduct.revenue)}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{overview.topProduct.quantitySold} unidades</span>
                      <span>•</span>
                      <span>{overview.topProduct.marginPercentage}% margen</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Best Employee */}
            {overview.topEmployee && (
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      ⭐ Top Empleado
                    </CardTitle>
                    <Zap className="h-4 w-4 text-blue-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-bold text-lg">{overview.topEmployee.employeeName}</p>
                    <p className="text-2xl font-bold">{formatCurrency(overview.topEmployee.revenue)}</p>
                    <p className="text-xs text-muted-foreground">
                      {overview.topEmployee.transactions} transacciones
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary Card */}
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    📊 Resumen
                  </CardTitle>
                  <Target className="h-4 w-4 text-purple-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Período</p>
                    <p className="font-semibold text-sm">Últimos 30 días</p>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mt-2">Promedio Diario</p>
                    <p className="font-bold text-lg">
                      {formatCurrency((parseFloat(overview.totalRevenue) / 30).toFixed(2))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
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
