import { z } from 'zod'

export const createDeliveryScheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6, 'Day of week must be 0-6 (Sunday=0)'),
  deliveryTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM or HH:MM:SS)').optional(),
  deliveryTimeEnd: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM or HH:MM:SS)').optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
})

export const updateDeliveryScheduleSchema = createDeliveryScheduleSchema.partial()

export const scheduleIdSchema = z.object({
  scheduleId: z.string().uuid('Invalid schedule ID'),
})

export type CreateDeliveryScheduleInput = z.infer<typeof createDeliveryScheduleSchema>
export type UpdateDeliveryScheduleInput = z.infer<typeof updateDeliveryScheduleSchema>
