import { z } from 'zod'

import { PurchaseOrderStatus } from '../db/entities/purchase-order.entity'

export const purchaseOrderStatusEnum = z.nativeEnum(PurchaseOrderStatus)

// Purchase Order Item Schema
export const purchaseOrderItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantityOrdered: z.number().int().positive('Quantity must be positive'),
  unitPrice: z.number().min(0, 'Unit price must be positive'),
  discountPercentage: z.number().min(0).max(100),
  taxRate: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
})

// Create Purchase Order Schema
export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid('Invalid supplier ID'),
  orderDate: z.string().date().optional(), // Defaults to today
  expectedDeliveryDate: z.string().date().optional(),
  taxAmount: z.number().min(0).optional(),
  shippingCost: z.number().min(0).optional(),
  notes: z.string().optional(),
  status: purchaseOrderStatusEnum,
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one item is required'),
})

// Update Purchase Order Schema
export const updatePurchaseOrderSchema = z.object({
  supplierId: z.string().uuid('Invalid supplier ID').optional(),
  orderDate: z.string().date().optional(),
  expectedDeliveryDate: z.string().date().optional(),
  actualDeliveryDate: z.string().date().optional(),
  taxAmount: z.number().min(0).optional(),
  shippingCost: z.number().min(0).optional(),
  notes: z.string().optional(),
  status: purchaseOrderStatusEnum.optional(),
  items: z.array(purchaseOrderItemSchema).optional(),
})

// Receive items schema
export const receiveItemsSchema = z.object({
  items: z.array(z.object({
    itemId: z.string().uuid('Invalid item ID'),
    quantityReceived: z.number().int().min(0, 'Quantity received must be non-negative'),
    batches: z.array(z.object({
      batchNumber: z.string().optional(),
      expirationDate: z.string().date('Fecha de vencimiento inválida'),
      quantity: z.number().int().positive('La cantidad del lote debe ser positiva'),
    })).optional(), // Solo requerido si producto.trackExpirationDates = true (validado en API)
  })).min(1, 'At least one item is required'),
})

// Update status schema
export const updateStatusSchema = z.object({
  status: purchaseOrderStatusEnum,
  notes: z.string().optional(),
})

// Query schema
export const purchaseOrderQuerySchema = z.object({
  supplierId: z.string().uuid().optional(),
  status: purchaseOrderStatusEnum.optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['orderDate', 'totalAmount', 'orderNumber']).default('orderDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const purchaseOrderIdSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
})

export type PurchaseOrderItemInput = z.infer<typeof purchaseOrderItemSchema>
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>
export type ReceiveItemsInput = z.infer<typeof receiveItemsSchema>
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>
export type PurchaseOrderQueryInput = z.infer<typeof purchaseOrderQuerySchema>
