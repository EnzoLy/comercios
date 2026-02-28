import { z } from 'zod'

export const createSaleReturnSchema = z.object({
  refundMethod: z.enum(['CASH', 'CARD', 'TRANSFER', 'QR', 'STORE_CREDIT']),
  refundAmount: z.number().positive(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        saleItemId: z.string().uuid(),
        quantity: z.number().int().positive(),
        restockItem: z.boolean().default(true),
      })
    )
    .min(1),
})

export type CreateSaleReturnInput = z.infer<typeof createSaleReturnSchema>
