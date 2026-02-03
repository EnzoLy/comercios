import { z } from 'zod'

const dateString = z.string().refine(
  (date) => !isNaN(Date.parse(date)),
  'Formato de fecha inválido'
)

const MAX_DATE_RANGE_DAYS = 365

const baseAnalyticsSchema = z.object({
  startDate: dateString,
  endDate: dateString,
  granularity: z.enum(['day', 'week', 'month']).default('day').optional(),
  sortBy: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
})

const validateDateRange = (data: any) => {
  const start = new Date(data.startDate)
  const end = new Date(data.endDate)
  if (end < start) {
    throw new Error('La fecha de fin debe ser mayor o igual a la fecha de inicio')
  }
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  if (diffDays > MAX_DATE_RANGE_DAYS) {
    throw new Error(`El rango de fechas no puede exceder ${MAX_DATE_RANGE_DAYS} días`)
  }
  return true
}

export const analyticsQuerySchema = baseAnalyticsSchema.refine(validateDateRange)

export const dailySalesQuerySchema = analyticsQuerySchema

export const employeePerformanceQuerySchema = analyticsQuerySchema

export const productAnalyticsQuerySchema = baseAnalyticsSchema
  .pick({ startDate: true, endDate: true, categoryId: true, search: true })
  .refine(validateDateRange)

export const categoryAnalyticsQuerySchema = analyticsQuerySchema

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>
export type DailySalesQuery = z.infer<typeof dailySalesQuerySchema>
export type EmployeePerformanceQuery = z.infer<typeof employeePerformanceQuerySchema>
export type ProductAnalyticsQuery = z.infer<typeof productAnalyticsQuerySchema>
export type CategoryAnalyticsQuery = z.infer<typeof categoryAnalyticsQuerySchema>
