import { z } from 'zod'

/**
 * Schema for recording a manual subscription payment
 */
export const recordPaymentSchema = z.object({
  storeId: z.string().uuid('Invalid store ID'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters (e.g., USD)'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'OTHER']),
  referenceNumber: z.string().optional(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  durationMonths: z.number().int().min(0).optional(),
  durationYears: z.number().int().min(0).optional(),
  isPermanent: z.boolean(),
  notes: z.string().optional(),
})

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>

/**
 * Schema for renewing a subscription
 */
export const renewSubscriptionSchema = z.object({
  storeId: z.string().uuid('Invalid store ID'),
  durationMonths: z.number().int().positive('Duration must be a positive integer').optional(),
  durationYears: z.number().int().positive('Duration must be a positive integer').optional(),
}).refine(
  (data) => !!data.durationMonths || !!data.durationYears,
  {
    message: 'Either durationMonths or durationYears must be specified',
    path: ['durationMonths'],
  }
)

export type RenewSubscriptionInput = z.infer<typeof renewSubscriptionSchema>

/**
 * Schema for toggling permanent subscription status
 */
export const togglePermanentSchema = z.object({
  storeId: z.string().uuid('Invalid store ID'),
  isPermanent: z.boolean(),
})

export type TogglePermanentInput = z.infer<typeof togglePermanentSchema>

/**
 * Schema for subscription stats query
 */
export const subscriptionStatsSchema = z.object({
  includeInactive: z.boolean().default(false),
})

export type SubscriptionStatsInput = z.infer<typeof subscriptionStatsSchema>
