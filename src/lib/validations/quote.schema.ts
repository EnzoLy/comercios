import { z } from 'zod'

export const quoteItemSchema = z.object({
  itemType: z.enum(['product', 'service', 'custom']),
  productId: z.string().uuid().optional().nullable(),
  serviceId: z.string().uuid().optional().nullable(),
  name: z.string().min(1, 'Item name is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.coerce.number().min(0, 'Unit price must be 0 or more'),
  discount: z.coerce.number().min(0, 'Discount must be 0 or more').default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
})

export const createQuoteSchema = z.object({
  clientName: z.string().min(2, 'Client name must be at least 2 characters'),
  clientPhone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(quoteItemSchema).min(1, 'At least one item is required'),
})

export const updateQuoteSchema = createQuoteSchema.partial().extend({
  status: z
    .enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'])
    .optional(),
})

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>
export type QuoteItemInput = z.infer<typeof quoteItemSchema>
