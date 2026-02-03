import { z } from 'zod'

export const generateAccessTokenSchema = z.object({
  employmentId: z.string().uuid('ID de empleo inválido'),
  expiresInHours: z
    .number()
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1 hora')
    .max(168, 'Máximo 7 días (168 horas)')
    .default(24),
})

export const validateAccessTokenSchema = z.object({
  token: z
    .string()
    .min(32, 'Token inválido')
    .max(64, 'Token inválido'),
})

export const revokeAccessTokenSchema = z.object({
  tokenId: z.string().uuid('ID de token inválido'),
})

export type GenerateAccessTokenInput = z.infer<typeof generateAccessTokenSchema>
export type ValidateAccessTokenInput = z.infer<typeof validateAccessTokenSchema>
export type RevokeAccessTokenInput = z.infer<typeof revokeAccessTokenSchema>

// Helper type for API response
export type AccessTokenResponse = {
  tokenId: string
  token: string
  qrUrl: string
  expiresAt: Date
}
