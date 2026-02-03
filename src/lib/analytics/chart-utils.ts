/**
 * Chart utilities for analytics visualization
 */

/**
 * Format currency values for display
 * @example formatCurrency(1234.56) => "$1,234.56"
 */
export function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '$0.00'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Format number values with thousands separator
 * @example formatNumber(1234567) => "1,234,567"
 */
export function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0'

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

/**
 * Format percentage values
 * @example formatPercentage(45.678) => "45.68%"
 */
export function formatPercentage(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0.00%'

  return `${num.toFixed(2)}%`
}

/**
 * Format decimal values to fixed precision
 * @example formatDecimal(45.6789, 2) => "45.68"
 */
export function formatDecimal(value: number | string, decimals: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0.00'

  return num.toFixed(decimals)
}

/**
 * Format large numbers with K, M, B abbreviations
 * @example formatCompactNumber(1234567) => "1.2M"
 */
export function formatCompactNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0'

  const absNum = Math.abs(num)
  const sign = num < 0 ? '-' : ''

  if (absNum >= 1e9) {
    return `${sign}${(num / 1e9).toFixed(1)}B`
  }
  if (absNum >= 1e6) {
    return `${sign}${(num / 1e6).toFixed(1)}M`
  }
  if (absNum >= 1e3) {
    return `${sign}${(num / 1e3).toFixed(1)}K`
  }

  return num.toString()
}

/**
 * Chart color palette
 */
export const chartColors = {
  primary: 'hsl(var(--chart-1))',
  secondary: 'hsl(var(--chart-2))',
  accent: 'hsl(var(--chart-3))',
  success: 'hsl(var(--chart-4))',
  warning: 'hsl(var(--chart-5))',

  // Additional colors for specific use cases
  revenue: '#3b82f6', // blue
  transactions: '#8b5cf6', // purple
  profit: '#10b981', // green
  loss: '#ef4444', // red
  neutral: '#6b7280', // gray

  // Palette array for multi-series charts
  palette: [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ],
}

/**
 * Get color based on value comparison
 * @example getStatusColor(150, 100) => "success" (value > baseline)
 */
export function getStatusColor(
  value: number,
  baseline: number
): 'success' | 'warning' | 'loss' | 'neutral' {
  if (value > baseline * 1.1) return 'success'
  if (value < baseline * 0.9) return 'loss'
  if (value < baseline) return 'warning'
  return 'neutral'
}

/**
 * Calculate trend percentage
 * @example calculateTrend(150, 100) => "50.00" (50% increase)
 */
export function calculateTrend(current: number, previous: number): string {
  if (previous === 0) return '0.00'
  const trend = ((current - previous) / previous) * 100
  return trend.toFixed(2)
}

/**
 * Format trend display with arrow
 * @example formatTrendDisplay(50.25) => "↑ 50.25%"
 */
export function formatTrendDisplay(percentageChange: number | string): string {
  const num = typeof percentageChange === 'string' ? parseFloat(percentageChange) : percentageChange
  if (isNaN(num)) return '→ 0.00%'

  const arrow = num > 0 ? '↑' : num < 0 ? '↓' : '→'
  const absValue = Math.abs(num).toFixed(2)
  return `${arrow} ${absValue}%`
}

/**
 * Custom Recharts tooltip formatter for currency values
 */
export function currencyTooltipFormatter(value: any): [string, string] {
  return [formatCurrency(value), '']
}

/**
 * Custom Recharts tooltip formatter for number values
 */
export function numberTooltipFormatter(value: any): [string, string] {
  return [formatNumber(value), '']
}

/**
 * Parse date string to formatted display
 * @example formatDateDisplay("2024-01-15") => "15 ene 2024"
 */
export function formatDateDisplay(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'N/A'
    return new Intl.DateTimeFormat('es-ES', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  } catch {
    return 'N/A'
  }
}

/**
 * Parse month string (YYYY-MM) to formatted display
 * @example formatMonthDisplay("2024-01") => "enero 2024"
 */
export function formatMonthDisplay(monthString: string | null | undefined): string {
  if (!monthString) return 'N/A'
  try {
    const [year, month] = monthString.split('-')
    const date = new Date(`${year}-${month}-01`)
    if (isNaN(date.getTime())) return 'N/A'
    return new Intl.DateTimeFormat('es-ES', {
      month: 'long',
      year: 'numeric',
    }).format(date)
  } catch {
    return 'N/A'
  }
}

/**
 * Round number to nearest thousand for readability in charts
 */
export function roundToThousand(value: number): number {
  return Math.round(value / 1000) * 1000
}

/**
 * Get appropriate tick formatter for large numbers
 */
export function getTickFormatter(maxValue: number): (value: number) => string {
  if (maxValue > 1e6) {
    return (value) => `${(value / 1e6).toFixed(1)}M`
  }
  if (maxValue > 1e3) {
    return (value) => `${(value / 1e3).toFixed(1)}K`
  }
  return (value) => value.toString()
}
