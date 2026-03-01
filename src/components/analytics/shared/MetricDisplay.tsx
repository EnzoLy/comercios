'use client'

import { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { formatCurrency, formatNumber, formatTrendDisplay } from '@/lib/analytics/chart-utils'

interface MetricDisplayProps {
  title: string
  value: string | number
  icon?: ReactNode
  format?: 'currency' | 'number' | 'percentage' | 'none'
  trend?: number | null
  description?: string
  highlight?: boolean
}

export function MetricDisplay({
  title,
  value,
  icon,
  format = 'currency',
  trend = null,
  description,
  highlight = false,
}: MetricDisplayProps) {
  const formatValue = () => {
    if (format === 'currency') return formatCurrency(value)
    if (format === 'number') return formatNumber(value)
    if (format === 'percentage') return `${parseFloat(String(value)).toFixed(2)}%`
    return String(value)
  }

  const trendColor = trend && trend > 0 ? 'text-green-600' : trend ? 'text-red-600' : ''

  return (
    <Card className={`p-6 ${highlight ? 'border-primary bg-primary/5' : ''}`}>
      <div className="flex items-start justify-between gap-4 overflow-hidden">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-2">{formatValue()}</p>
          {description && <p className="text-xs text-muted-foreground mt-2">{description}</p>}
          {trend !== null && (
            <p className={`text-sm font-medium mt-2 ${trendColor}`}>
              {formatTrendDisplay(trend)}
            </p>
          )}
        </div>
        {icon && <div className="text-4xl text-muted-foreground flex-shrink-0 h-16 w-16 flex items-center justify-center">{icon}</div>}
      </div>
    </Card>
  )
}
