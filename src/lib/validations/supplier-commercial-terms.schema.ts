import { z } from 'zod'

export const createSupplierCommercialTermsSchema = z.object({
  // Payment Terms
  paymentTermsDays: z.number().int().positive().optional(),
  paymentMethod: z.enum(['TRANSFER', 'CHECK', 'CASH', 'CREDIT_CARD', 'OTHER']).optional(),
  earlyPaymentDiscount: z.number().min(0).max(100).optional(),
  earlyPaymentDays: z.number().int().positive().optional(),

  // Purchase Conditions
  minimumPurchaseAmount: z.number().min(0).optional(),
  minimumPurchaseQuantity: z.number().int().positive().optional(),

  // Delivery
  leadTimeDays: z.number().int().positive().optional(),
  deliveryFrequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'ON_DEMAND']).optional(),

  // Financial
  currency: z.string().length(3, 'Currency must be 3 letters (ISO 4217)').default('USD'),
  creditLimit: z.number().min(0).optional(),

  notes: z.string().optional(),
})

export const updateSupplierCommercialTermsSchema = createSupplierCommercialTermsSchema.partial()

// Volume Discount Schema
const volumeDiscountBaseSchema = z.object({
  minimumQuantity: z.number().int().positive().optional(),
  minimumAmount: z.number().min(0).optional(),
  discountPercentage: z.number().min(0).max(100),
  description: z.string().max(255).optional(),
  validFrom: z.string().date().optional().transform(v => v ? new Date(v) : undefined),
  validUntil: z.string().date().optional().transform(v => v ? new Date(v) : undefined),
  isActive: z.boolean().default(true),
})

export const createVolumeDiscountSchema = volumeDiscountBaseSchema.refine(
  (data) => data.minimumQuantity || data.minimumAmount,
  {
    message: 'Either minimumQuantity or minimumAmount is required',
  }
)

export const updateVolumeDiscountSchema = volumeDiscountBaseSchema.partial()

export const volumeDiscountIdSchema = z.object({
  discountId: z.string().uuid('Invalid discount ID'),
})

export type CreateSupplierCommercialTermsInput = z.infer<typeof createSupplierCommercialTermsSchema>
export type UpdateSupplierCommercialTermsInput = z.infer<typeof updateSupplierCommercialTermsSchema>
export type CreateVolumeDiscountInput = z.infer<typeof createVolumeDiscountSchema>
export type UpdateVolumeDiscountInput = z.infer<typeof updateVolumeDiscountSchema>
