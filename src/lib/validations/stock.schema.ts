import { z } from 'zod'
import { MovementType } from '../db/entities/stock-movement.entity'

export const createStockMovementSchema = z.object({
  productId: z.string().uuid('ID de producto inválido'),
  type: z.nativeEnum(MovementType),
  quantity: z.number().int().refine((val) => val !== 0, {
    message: 'La cantidad no puede ser cero',
  }),
  unitPrice: z.number().min(0).optional(),
  notes: z.string().optional(),
  reference: z.string().optional(),
})

export const stockAdjustmentSchema = z.object({
  productId: z.string().uuid('ID de producto inválido'),
  quantity: z.number().int().refine((val) => val !== 0, {
    message: 'La cantidad de ajuste no puede ser cero',
  }),
  notes: z.string().min(1, 'Las notas son requeridas para ajustes de stock'),
})

export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>
