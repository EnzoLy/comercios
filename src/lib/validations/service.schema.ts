import { z } from 'zod'

export const createServiceSchema = z.object({
  name: z.string().min(2, 'El nombre del servicio debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo'),
  categoryId: z.string().uuid().optional().nullable(),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
})

export const updateServiceSchema = createServiceSchema.partial()

export const createServiceCategorySchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color inválido').optional(),
})

export const updateServiceCategorySchema = createServiceCategorySchema.partial()

export const createServiceAppointmentSchema = z.object({
  serviceId: z.string().uuid('ID del servicio inválido'),
  clientName: z.string().min(2, 'El nombre del cliente debe tener al menos 2 caracteres'),
  clientPhone: z.string().optional().nullable(),
  scheduledAt: z.coerce.date(),
  notes: z.string().optional().nullable(),
})

export const updateServiceAppointmentSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).optional(),
  clientName: z.string().min(2).optional(),
  clientPhone: z.string().optional().nullable(),
  clientEmail: z.string().email().optional().nullable(),
  scheduledAt: z.coerce.date().optional(),
  notes: z.string().optional().nullable(),
})

export type CreateServiceInput = z.infer<typeof createServiceSchema>
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>
export type CreateServiceCategoryInput = z.infer<typeof createServiceCategorySchema>
export type UpdateServiceCategoryInput = z.infer<typeof updateServiceCategorySchema>
export type CreateServiceAppointmentInput = z.infer<typeof createServiceAppointmentSchema>
export type UpdateServiceAppointmentInput = z.infer<typeof updateServiceAppointmentSchema>
