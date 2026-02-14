'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { TrendingUp, Trophy, Target, Zap, Box } from 'lucide-react'
import { toast } from 'sonner'
import { useActiveEmployee } from '@/contexts/active-employee-context'

interface PersonalStatsData {
  period: string
  totalSales: number
  totalRevenue: number
  averageTransaction: number
  storeAverageTransaction: number
  topProduct: { name: string; quantity: number } | null
  ranking: { rank: number; total: number }
  isAboveAverage: boolean
}

interface PersonalStatsProps {
  storeId: string
  refreshTrigger?: number
}

export function PersonalStats({ storeId, refreshTrigger }: PersonalStatsProps) {
  const { activeEmployee } = useActiveEmployee()
  const [stats, setStats] = useState<PersonalStatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [storeId, refreshTrigger, activeEmployee?.id])

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      const activeUserId = localStorage.getItem('activeUserId')
      // Ensure we only send valid IDs, not "undefined" or "null" strings
      const isValidId = activeUserId && activeUserId !== 'undefined' && activeUserId !== 'null'
      const queryParam = isValidId ? `&activeUserId=${activeUserId}` : ''

      const response = await fetch(`/api/stores/${storeId}/pos/my-stats?period=today${queryParam}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        toast.error('Error al cargar estadísticas')
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      toast.error('Error al cargar estadísticas')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !stats) {
    return (
      <Card className="mb-4" style={{ borderColor: 'var(--color-primary)' }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mi Desempeño Hoy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card style={{ borderColor: 'var(--color-primary)' }} className="shadow-none p-4 md:p-8">
      <CardHeader className="px-0 pb-4">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Mi Rendimiento
          <span className="text-xs font-normal text-muted-foreground ml-auto bg-primary/5 px-2 py-1 rounded-full uppercase tracking-widest font-bold">Hoy</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-card border border-border/50 rounded-3xl shadow-sm hover:shadow-md transition-all">
            <div className="p-2 bg-blue-500/10 rounded-xl w-fit mb-3">
              <Trophy className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ventas</p>
            <p className="text-2xl font-black text-blue-600">
              {stats.totalSales}
            </p>
          </div>
          <div className="p-4 bg-card border border-border/50 rounded-3xl shadow-sm hover:shadow-md transition-all">
            <div className="p-2 bg-emerald-500/10 rounded-xl w-fit mb-3">
              <Zap className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ingresos</p>
            <p className="text-2xl font-black text-emerald-600">
              {formatCurrency(stats.totalRevenue)}
            </p>
          </div>
        </div>

        <div className={`p-5 rounded-3xl border transition-all ${stats.isAboveAverage
          ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800'
          : 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
          }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-background rounded-xl">
              <Target className={`h-4 w-4 ${stats.isAboveAverage ? 'text-emerald-600' : 'text-amber-600'}`} />
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Media Tienda</p>
              <p className="text-xs font-bold">{formatCurrency(stats.storeAverageTransaction)}</p>
            </div>
          </div>

          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Tu Promedio</p>
          <p className={`text-2xl font-black ${stats.isAboveAverage ? 'text-emerald-600' : 'text-amber-600'}`}>
            {formatCurrency(stats.averageTransaction)}
          </p>

          {stats.isAboveAverage && (
            <p className="text-[10px] font-black text-emerald-600 mt-2 bg-emerald-500/10 w-fit px-2 py-0.5 rounded-full uppercase tracking-tighter">
              ✓ Superando el promedio!
            </p>
          )}
        </div>

        {stats.topProduct && (
          <div className="p-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl text-white shadow-lg shadow-indigo-500/20">
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-4">Top Producto</p>
            <p className="text-lg font-bold leading-tight line-clamp-2 mb-2">
              {stats.topProduct.name}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-lg">
                {stats.topProduct.quantity} vendidos
              </span>
              <Trophy className="h-5 w-5 text-white/50" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
