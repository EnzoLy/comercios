import { z } from 'zod'

export const createStoreSchema = z.object({
  name: z.string().min(1, 'Store name required').max(255),
  slug: z.string()
    .min(1, 'Slug required')
    .max(255)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  ownerId: z.string().uuid('Valid user ID required'),
  description: z.string().max(1000).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email('Valid email required').optional(),
})

export type CreateStoreInput = z.infer<typeof createStoreSchema>
