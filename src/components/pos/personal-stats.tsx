'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { TrendingUp, Trophy, Target } from 'lucide-react'
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
      <Card className="mb-4">
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
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Mi Desempeño Hoy
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Sales Count and Revenue */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
              <p className="text-xs text-gray-600 dark:text-gray-400">Ventas</p>
              <p className="text-lg font-bold text-blue-600">
                {stats.totalSales}
              </p>
            </div>
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
              <p className="text-xs text-gray-600 dark:text-gray-400">Ingresos</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
          </div>

          {/* Average Transaction */}
          <div
            className={`p-2 rounded ${stats.isAboveAverage
              ? 'bg-emerald-50 dark:bg-emerald-900/20'
              : 'bg-orange-50 dark:bg-orange-900/20'
              }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Promedio por Venta
                </p>
                <p
                  className={`text-sm font-semibold ${stats.isAboveAverage
                    ? 'text-emerald-600'
                    : 'text-orange-600'
                    }`}
                >
                  {formatCurrency(stats.averageTransaction)}
                </p>
              </div>
              <p className="text-xs text-gray-500">
                Tienda: {formatCurrency(stats.storeAverageTransaction)}
              </p>
            </div>
            {stats.isAboveAverage && (
              <p className="text-xs text-emerald-600 mt-1">
                ✓ Arriba del promedio
              </p>
            )}
          </div>

          {/* Top Product */}
          {stats.topProduct && (
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Mejor Vendido
              </p>
              <p className="text-sm font-semibold text-purple-600 truncate">
                {stats.topProduct.name}
              </p>
              <p className="text-xs text-gray-500">
                {stats.topProduct.quantity} vendido{
                  stats.topProduct.quantity !== 1 ? 's' : ''
                }
              </p>
            </div>
          )}

          {/* Ranking */}
          <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-600" />
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Posición
              </p>
              <p className="text-sm font-semibold text-yellow-600">
                #{stats.ranking.rank} de {stats.ranking.total}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
