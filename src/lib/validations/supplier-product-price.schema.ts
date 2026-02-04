import { z } from 'zod'

export const createSupplierProductPriceSchema = z.object({
  price: z.number().min(0, 'Price must be positive'),
  currency: z.string().length(3, 'Currency must be 3 letters (ISO 4217)').default('USD'),
  effectiveDate: z.string().date().optional().transform(v => v ? new Date(v) : undefined), // Defaults to today if not provided
  sku: z.string().max(100).optional(),
  minimumOrderQuantity: z.number().int().positive().optional(),
  packSize: z.number().int().positive().optional(),
})

export const updateSupplierProductPriceSchema = createSupplierProductPriceSchema.partial()

// Add product to supplier
export const addProductToSupplierSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  supplierSku: z.string().max(100).optional(),
  isPreferred: z.boolean().default(false),
  initialPrice: z.number().min(0).optional(),
  notes: z.string().optional(),
})

// Bulk add products by category
export const bulkAddProductsByCategorySchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  supplierSku: z.string().max(100).optional(),
  isPreferred: z.boolean().default(false),
})

// Price history query
export const priceHistoryQuerySchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
})

// Price comparison query
export const priceComparisonQuerySchema = z.object({
  productIds: z.array(z.string().uuid()).optional(),
  categoryId: z.string().uuid().optional(),
  supplierIds: z.array(z.string().uuid()).min(2, 'At least 2 suppliers required for comparison'),
})

// Price trends query
export const priceTrendsQuerySchema = z.object({
  productIds: z.array(z.string().uuid()).min(1, 'At least one product ID is required'),
  supplierIds: z.array(z.string().uuid()).optional(),
  startDate: z.string().date(),
  endDate: z.string().date(),
})

export type CreateSupplierProductPriceInput = z.infer<typeof createSupplierProductPriceSchema>
export type UpdateSupplierProductPriceInput = z.infer<typeof updateSupplierProductPriceSchema>
export type AddProductToSupplierInput = z.infer<typeof addProductToSupplierSchema>
export type BulkAddProductsByCategoryInput = z.infer<typeof bulkAddProductsByCategorySchema>
export type PriceHistoryQueryInput = z.infer<typeof priceHistoryQuerySchema>
export type PriceComparisonQueryInput = z.infer<typeof priceComparisonQuerySchema>
export type PriceTrendsQueryInput = z.infer<typeof priceTrendsQuerySchema>
