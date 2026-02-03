import { z } from 'zod'

const WEAK_PINS = [
  '0000', '1111', '2222', '3333', '4444', '5555',
  '6666', '7777', '8888', '9999', '1234', '4321',
  '1357', '2468', '9876', '0123'
]

export const pinSchema = z
  .string()
  .regex(/^\d{4}$/, 'El PIN debe tener exactamente 4 dígitos')
  .refine(pin => !WEAK_PINS.includes(pin), {
    message: 'Este PIN es muy débil. Elige otro.'
  })

export const setPinSchema = z.object({
  pin: pinSchema,
  confirmPin: z.string()
}).refine(data => data.pin === data.confirmPin, {
  message: 'Los PINs no coinciden',
  path: ['confirmPin']
})

export const validatePinSchema = z.object({
  employmentId: z.string().uuid(),
  pin: z.string().regex(/^\d{4}$/, 'PIN debe ser 4 dígitos')
})
