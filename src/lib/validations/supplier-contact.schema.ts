import { z } from 'zod'

export const createSupplierContactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  position: z.string().max(100).optional(),
  email: z.string().email('Invalid email').optional(),
  phone: z.string().max(20).optional(),
  mobilePhone: z.string().max(20).optional(),
  isPrimary: z.boolean(),
  isActive: z.boolean(),
  notes: z.string().optional(),
})

export const updateSupplierContactSchema = createSupplierContactSchema.partial()

export const contactIdSchema = z.object({
  contactId: z.string().uuid('Invalid contact ID'),
})

// At least one contact method should be provided
export const createSupplierContactWithValidationSchema = createSupplierContactSchema.refine(
  (data) => data.email || data.phone || data.mobilePhone,
  {
    message: 'At least one contact method (email, phone, or mobile) is required',
  }
)

export type CreateSupplierContactInput = z.infer<typeof createSupplierContactSchema>
export type UpdateSupplierContactInput = z.infer<typeof updateSupplierContactSchema>
