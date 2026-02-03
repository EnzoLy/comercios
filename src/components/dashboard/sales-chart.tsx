'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface SalesData {
  date: string
  revenue: number
  transactions: number
}

interface SalesChartProps {
  data: SalesData[]
}

export function SalesChart({ data }: SalesChartProps) {
  const [period, setPeriod] = useState<'7' | '30'>('7')
  const [themeColors, setThemeColors] = useState({
    primary: '#10b981',
    secondary: '#3b82f6',
  })

  useEffect(() => {
    const root = document.documentElement
    const primary = getComputedStyle(root).getPropertyValue('--color-primary').trim()
    const secondary = getComputedStyle(root).getPropertyValue('--color-secondary').trim()

    setThemeColors({
      primary: primary || '#10b981',
      secondary: secondary || '#3b82f6',
    })
  }, [])

  // Filter data based on selected period
  const filteredData = data.slice(-parseInt(period))

  // Format currency for tooltip
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
          <p className="font-medium mb-1">{payload[0].payload.date}</p>
          <p className="text-sm" style={{ color: 'var(--color-primary)' }}>
            Ingresos: ${payload[0].value.toFixed(2)}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-secondary)' }}>
            Transacciones: {payload[1]?.value || 0}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tendencia de Ventas</CardTitle>
            <CardDescription>Ingresos y transacciones a lo largo del tiempo</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={period === '7' ? 'default' : 'outline'}
              onClick={() => setPeriod('7')}
            >
              7 Días
            </Button>
            <Button
              size="sm"
              variant={period === '30' ? 'default' : 'outline'}
              onClick={() => setPeriod('30')}
            >
              30 Días
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            No hay datos de ventas disponibles
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis
                yAxisId="left"
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                tickFormatter={formatCurrency}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke={themeColors.primary}
                strokeWidth={2}
                dot={{ fill: themeColors.primary, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="transactions"
                stroke={themeColors.secondary}
                strokeWidth={2}
                dot={{ fill: themeColors.secondary, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
