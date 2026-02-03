'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency, formatNumber, getTickFormatter } from '@/lib/analytics/chart-utils'

interface BarComparisonChartProps {
  data: any[]
  dataKey: string
  nameKey?: string
  title?: string
  color?: string
  layout?: 'vertical' | 'horizontal'
  height?: number
  formatValue?: (value: number) => string
}

export function BarComparisonChart({
  data,
  dataKey,
  nameKey = 'name',
  title,
  color = 'hsl(var(--chart-1))',
  layout = 'vertical',
  height = 300,
  formatValue,
}: BarComparisonChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">Sin datos disponibles</div>
  }

  const maxValue = Math.max(...data.map((d) => parseFloat(d[dataKey] || 0)))
  const defaultFormatter = () => getTickFormatter(maxValue)

  return (
    <div className="w-full">
      {title && <h3 className="text-sm font-medium mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={layout}
          margin={
            layout === 'vertical'
              ? { top: 5, right: 30, left: 200, bottom: 5 }
              : { top: 5, right: 30, left: 0, bottom: 5 }
          }
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type={layout === 'vertical' ? 'number' : 'category'}
            tick={{ fontSize: 12 }}
            tickFormatter={layout === 'vertical' ? defaultFormatter() : undefined}
          />
          <YAxis
            type={layout === 'vertical' ? 'category' : 'number'}
            dataKey={layout === 'vertical' ? nameKey : undefined}
            tick={{ fontSize: 12 }}
            width={layout === 'vertical' ? 190 : undefined}
            tickFormatter={layout === 'horizontal' ? defaultFormatter() : undefined}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: 'none',
              borderRadius: '8px',
            }}
            formatter={(value: any) => {
              const numValue = typeof value === 'number' ? value : 0
              if (formatValue) return formatValue(numValue)
              if (dataKey.includes('revenue') || dataKey.includes('price')) {
                return formatCurrency(numValue)
              }
              return formatNumber(numValue)
            }}
            labelFormatter={(label: any) => (layout === 'vertical' ? '' : label)}
          />
          <Legend />
          <Bar
            dataKey={dataKey}
            fill={color}
            isAnimationActive={true}
            radius={layout === 'horizontal' ? [0, 8, 8, 0] : [8, 0, 0, 8]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
