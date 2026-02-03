import { z } from 'zod'
import { EmploymentRole } from '../db/entities/employment.entity'

export const inviteEmployeeSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Dirección de correo inválida').optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
  role: z.nativeEnum(EmploymentRole),
  startDate: z.string().datetime().optional(),
})

export const updateEmploymentSchema = z.object({
  role: z.nativeEnum(EmploymentRole).optional(),
  isActive: z.boolean().optional(),
  endDate: z.string().datetime().optional(),
})

export type InviteEmployeeInput = z.infer<typeof inviteEmployeeSchema>
export type UpdateEmploymentInput = z.infer<typeof updateEmploymentSchema>
