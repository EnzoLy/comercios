import { z } from 'zod'

// Create batch schema
export const createBatchSchema = z.object({
  productId: z.string().uuid('ID de producto inválido'),
  batchNumber: z.string().optional(),
  expirationDate: z.string().date('Fecha de vencimiento inválida'),
  initialQuantity: z.number().int().positive('La cantidad inicial debe ser positiva'),
  unitCost: z.number().min(0, 'El costo unitario debe ser positivo'),
  purchaseOrderId: z.string().uuid('ID de orden de compra inválido').optional(),
  purchaseOrderItemId: z.string().uuid('ID de item de orden inválido').optional(),
})

// Update batch schema
export const updateBatchSchema = z.object({
  batchNumber: z.string().optional(),
  expirationDate: z.string().date('Fecha de vencimiento inválida').optional(),
  currentQuantity: z.number().int().min(0, 'La cantidad debe ser no negativa').optional(),
  unitCost: z.number().min(0, 'El costo unitario debe ser positivo').optional(),
})

// Query batches schema
export const batchQuerySchema = z.object({
  productId: z.string().uuid('ID de producto inválido').optional(),
  showExpired: z.coerce.boolean().default(false),
  expiringInDays: z.coerce.number().int().positive().optional(), // Filtra lotes que vencen en X días
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['expirationDate', 'createdAt', 'currentQuantity']).default('expirationDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

// Expiring products report schema
export const expiringProductsReportSchema = z.object({
  days: z.coerce.number().int().positive().default(30), // Productos que vencen en los próximos X días
  categoryId: z.string().uuid('ID de categoría inválido').optional().nullable().transform(val => val || undefined),
  onlyExpired: z.coerce.boolean().default(false), // Solo mostrar productos ya vencidos
})

// Adjust batch quantity schema
export const adjustBatchQuantitySchema = z.object({
  batchId: z.string().uuid('ID de lote inválido'),
  quantityAdjustment: z.number().int(), // Positivo para agregar, negativo para reducir
  notes: z.string().optional(),
})

export type CreateBatchInput = z.infer<typeof createBatchSchema>
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>
export type BatchQueryInput = z.infer<typeof batchQuerySchema>
export type ExpiringProductsReportInput = z.infer<typeof expiringProductsReportSchema>
export type AdjustBatchQuantityInput = z.infer<typeof adjustBatchQuantitySchema>
