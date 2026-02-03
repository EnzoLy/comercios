'use client'

import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency, formatPercentage, chartColors } from '@/lib/analytics/chart-utils'

interface PieDistributionChartProps {
  data: any[]
  dataKey: string
  nameKey?: string
  title?: string
  variant?: 'pie' | 'donut'
  height?: number
  formatValue?: (value: number) => string
}

export function PieDistributionChart({
  data,
  dataKey,
  nameKey = 'name',
  title,
  variant = 'pie',
  height = 300,
  formatValue,
}: PieDistributionChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">Sin datos disponibles</div>
  }

  const colors = chartColors.palette

  const total = data.reduce((sum, item) => sum + parseFloat(item[dataKey] || 0), 0)

  return (
    <div className="w-full">
      {title && <h3 className="text-sm font-medium mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value, percent }: any) => {
              const percentage = percent ? (percent * 100).toFixed(1) : '0'
              return `${name}: ${percentage}%`
            }}
            outerRadius={variant === 'donut' ? 100 : 120}
            innerRadius={variant === 'donut' ? 60 : 0}
            fill="#8884d8"
            dataKey={dataKey}
            isAnimationActive={true}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
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
              return numValue
            }}
            labelFormatter={(label: any, payload: any) => {
              if (payload && payload.length > 0) {
                const payloadValue = typeof payload[0].value === 'number' ? payload[0].value : 0
                const percentage = total > 0 ? ((payloadValue / total) * 100).toFixed(1) : '0'
                return `${percentage}%`
              }
              return label
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
