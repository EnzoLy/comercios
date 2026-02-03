import { z } from 'zod'

// Base schema without refinement
const baseProductSchema = z.object({
  name: z.string().min(2, 'El nombre del producto debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  sku: z.string().min(1, 'El SKU es requerido'),
  barcode: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  costPrice: z.number().min(0, 'El precio de costo debe ser positivo'),
  sellingPrice: z.number().min(0, 'El precio de venta debe ser positivo'),
  currentStock: z.number().int().min(0, 'El stock debe ser no negativo').default(0),
  minStockLevel: z.number().int().min(0).default(10),
  maxStockLevel: z.number().int().min(0).optional(),
  unit: z.string().optional(),
  imageUrl: z.string().url('URL de imagen inválida').optional().or(z.literal('')),
  trackStock: z.boolean().default(true),
  isActive: z.boolean().default(true),
  isWeighedProduct: z.boolean().default(false),
  weightUnit: z.string().optional(),
  additionalBarcodes: z.array(z.string().min(1)).optional(),
})

// Create schema with refinement
export const createProductSchema = baseProductSchema.refine((data) => {
  if (data.maxStockLevel && data.maxStockLevel < data.minStockLevel) {
    return false
  }
  return true
}, {
  message: 'El nivel máximo de stock debe ser mayor que el nivel mínimo',
  path: ['maxStockLevel'],
})

// Update schema is partial of base (before refinement)
export const updateProductSchema = baseProductSchema.partial()

export const barcodeSearchSchema = z.object({
  barcode: z.string().min(1, 'El código de barras es requerido'),
})

export const bulkPriceAdjustmentSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1, 'Selecciona al menos un producto'),
  adjustmentType: z.enum(['percentage', 'fixed', 'replace']),
  targetField: z.enum(['sellingPrice', 'costPrice', 'both']),
  adjustmentValue: z.number().refine(val => val !== 0, 'El valor no puede ser cero'),
}).refine(
  (data) => data.adjustmentType !== 'replace' || data.adjustmentValue >= 0,
  { message: 'Para reemplazo, el valor debe ser positivo', path: ['adjustmentValue'] }
)

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type BarcodeSearchInput = z.infer<typeof barcodeSearchSchema>
export type BulkPriceAdjustmentInput = z.infer<typeof bulkPriceAdjustmentSchema>
