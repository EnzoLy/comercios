import { z } from 'zod'

// Supplier base schema
export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  taxId: z.string().max(100).optional(),
  website: z.string().url('Invalid URL').or(z.literal('')).optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zipCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  currency: z.string().length(3, 'Currency must be 3 letters (ISO 4217)'),
  rating: z.number().min(1).max(5).optional(),
  isPreferred: z.boolean(),
  notes: z.string().optional(),
  isActive: z.boolean(),

  // Primary contact fields (used in the form to create a contact along with the supplier)
  contactName: z.string().max(255).optional(),
  contactPosition: z.string().max(100).optional(),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  contactPhone: z.string().max(20).optional(),
  contactMobilePhone: z.string().max(20).optional(),

  // Deprecated fields (maintained for backward compatibility)
  contactPerson: z.string().max(255).optional(),
  email: z.string().email('Invalid email').optional(),
  phone: z.string().max(20).optional(),
})

export const updateSupplierSchema = createSupplierSchema.partial()

export const supplierIdSchema = z.object({
  supplierId: z.string().uuid('Invalid supplier ID'),
})

// Query schemas
export const supplierQuerySchema = z.object({
  search: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  isActive: z.enum(['true', 'false', 'all']).optional(),
  isPreferred: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['name', 'city', 'createdAt', 'rating']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>
export type SupplierQueryInput = z.infer<typeof supplierQuerySchema>
