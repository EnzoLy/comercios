import { z } from 'zod'
import { PaymentMethod } from '../db/entities/sale.entity'

export const saleItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be positive'),
  discount: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(100).default(0),
  taxAmount: z.number().min(0).default(0),
})

export const createSaleSchema = z.object({
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  tax: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  amountPaid: z.number().min(0).optional(),
  notes: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  customerPhone: z.string().optional(),
})

export const cancelSaleSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required'),
})

export type SaleItemInput = z.infer<typeof saleItemSchema>
export type CreateSaleInput = z.infer<typeof createSaleSchema>
export type CancelSaleInput = z.infer<typeof cancelSaleSchema>
