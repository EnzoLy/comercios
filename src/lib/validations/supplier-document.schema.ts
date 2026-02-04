import { z } from 'zod'

import { DocumentType } from '../db/entities/supplier-document.entity'

export const documentTypeEnum = z.nativeEnum(DocumentType)

export const createSupplierDocumentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  documentType: documentTypeEnum.default(DocumentType.OTHER),
  fileName: z.string().min(1, 'File name is required').max(255),
  fileUrl: z.string().url('Invalid file URL'),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().max(100).optional(),
  validFrom: z.string().date().optional().transform(v => v ? new Date(v) : undefined),
  validUntil: z.string().date().optional().transform(v => v ? new Date(v) : undefined),
  isActive: z.boolean().default(true),
})

export const updateSupplierDocumentSchema = createSupplierDocumentSchema.partial()

export const documentIdSchema = z.object({
  documentId: z.string().uuid('Invalid document ID'),
})

export const documentQuerySchema = z.object({
  documentType: documentTypeEnum.optional(),
  isActive: z.enum(['true', 'false', 'all']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type CreateSupplierDocumentInput = z.infer<typeof createSupplierDocumentSchema>
export type UpdateSupplierDocumentInput = z.infer<typeof updateSupplierDocumentSchema>
export type DocumentQueryInput = z.infer<typeof documentQuerySchema>
