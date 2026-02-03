'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar,
} from 'recharts'
import { formatCurrency, formatNumber, getTickFormatter } from '@/lib/analytics/chart-utils'

interface TimeSeriesChartProps {
  data: any[]
  title?: string
  seriesConfig: Array<{
    key: string
    name: string
    color: string
    type?: 'line' | 'bar'
    yAxis?: 'left' | 'right'
  }>
  showLegend?: boolean
  height?: number
}

export function TimeSeriesChart({
  data,
  title,
  seriesConfig,
  showLegend = true,
  height = 300,
}: TimeSeriesChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">Sin datos disponibles</div>
  }

  // Determine if we need ComposedChart (for mixed chart types)
  const hasMixedTypes = seriesConfig.some((s) => s.type === 'bar')

  // Get max values for tick formatters
  const maxRevenue = Math.max(...data.map((d) => parseFloat(d[seriesConfig[0].key] || 0)))
  const maxTransactions = Math.max(...data.map((d) => parseFloat(d[seriesConfig[1]?.key] || 0)))

  const ChartComponent = hasMixedTypes ? ComposedChart : LineChart

  return (
    <div className="w-full">
      {title && <h3 className="text-sm font-medium mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 12 }}
            tickFormatter={getTickFormatter(maxRevenue)}
          />
          {seriesConfig.length > 1 && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              tickFormatter={getTickFormatter(maxTransactions)}
            />
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: 'none',
              borderRadius: '8px',
            }}
            formatter={(value: any) => {
              const numValue = typeof value === 'number' ? value : 0
              const config = seriesConfig.find((s) => s.key)
              if (config?.key === 'revenue') return formatCurrency(numValue)
              return formatNumber(numValue)
            }}
          />
          {showLegend && <Legend />}
          {hasMixedTypes ? (
            <>
              {seriesConfig.map((config) =>
                config.type === 'bar' ? (
                  <Bar
                    key={config.key}
                    yAxisId={config.yAxis || 'left'}
                    dataKey={config.key}
                    name={config.name}
                    fill={config.color}
                    isAnimationActive={true}
                  />
                ) : (
                  <Line
                    key={config.key}
                    yAxisId={config.yAxis || 'left'}
                    type="monotone"
                    dataKey={config.key}
                    name={config.name}
                    stroke={config.color}
                    isAnimationActive={true}
                    dot={false}
                    strokeWidth={2}
                  />
                )
              )}
            </>
          ) : (
            <>
              {seriesConfig.map((config) => (
                <Line
                  key={config.key}
                  yAxisId={config.yAxis || 'left'}
                  type="monotone"
                  dataKey={config.key}
                  name={config.name}
                  stroke={config.color}
                  isAnimationActive={true}
                  dot={false}
                  strokeWidth={2}
                />
              ))}
            </>
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  )
}
