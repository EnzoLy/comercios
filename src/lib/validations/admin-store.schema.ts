import { z } from 'zod'

export const createStoreSchema = z.object({
  name: z.string().min(1, 'Nombre de tienda requerido').max(255),
  slug: z.string()
    .min(1, 'Slug requerido')
    .max(255)
    .regex(/^[a-z0-9-]+$/, 'El slug debe ser alfanumérico en minúsculas con guiones'),
  // Campos para usuario existente
  ownerId: z.string().optional(),
  // Campos para nuevo usuario
  ownerName: z.string().optional(),
  ownerEmail: z.string().optional(),
  ownerPassword: z.string().optional(),
  // Campos opcionales de la tienda
  description: z.string().max(1000).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email('Email válido requerido').optional().or(z.literal('')),
}).refine((data) => {
  // Debe tener ownerId O los campos de nuevo usuario
  if (data.ownerId) {
    return z.string().uuid().safeParse(data.ownerId).success
  }
  // Si no hay ownerId, validar campos de nuevo usuario
  if (!data.ownerName || !data.ownerEmail || !data.ownerPassword) {
    return false
  }
  // Validar email
  if (!z.string().email().safeParse(data.ownerEmail).success) {
    return false
  }
  // Validar contraseña (mínimo 6 caracteres)
  if (data.ownerPassword.length < 6) {
    return false
  }
  return true
}, {
  message: 'Debes seleccionar un usuario existente o proporcionar datos completos para un nuevo usuario',
  path: ['ownerId']
})

export type CreateStoreInput = z.infer<typeof createStoreSchema>
