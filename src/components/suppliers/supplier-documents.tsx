'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Calendar,
  FileSpreadsheet,
  FileImage,
  File,
  FileCog,
} from 'lucide-react'

interface SupplierDocument {
  id: string
  name: string
  description?: string
  documentType: string
  fileName: string
  fileUrl: string
  fileSize?: number
  mimeType?: string
  validFrom?: Date
  validUntil?: Date
  isActive: boolean
  createdAt: Date
}

interface SupplierDocumentsProps {
  supplierId: string
  initialDocuments: any[]
  storeId: string
}

export function SupplierDocuments({ supplierId, initialDocuments, storeId }: SupplierDocumentsProps) {
  const [documents] = useState<SupplierDocument[]>(initialDocuments)

  const getDocumentIcon = (mimeType?: string) => {
    if (!mimeType) return <File className="h-5 w-5" />

    if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />
    if (mimeType.includes('sheet') || mimeType.includes('excel')) {
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />
    }
    if (mimeType.includes('image')) return <FileImage className="h-5 w-5 text-blue-500" />
    if (mimeType.includes('word')) return <FileText className="h-5 w-5 text-blue-600" />

    return <File className="h-5 w-5" />
  }

  const getDocumentTypeBadge = (type: string) => {
    const types: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      PRICE_LIST: { label: 'Lista de Precios', variant: 'default' },
      CATALOG: { label: 'Catálogo', variant: 'secondary' },
      CONTRACT: { label: 'Contrato', variant: 'outline' },
      CERTIFICATE: { label: 'Certificado', variant: 'outline' },
      TAX_DOCUMENT: { label: 'Documento Fiscal', variant: 'outline' },
      OTHER: { label: 'Otro', variant: 'secondary' },
    }

    const typeInfo = types[type] || types.OTHER
    return <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Tamaño desconocido'

    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date))
  }

  const isDocumentExpired = (validUntil?: Date) => {
    if (!validUntil) return false
    return new Date(validUntil) < new Date()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Documentos del Proveedor</h3>
          <p className="text-sm text-muted-foreground">
            Contratos, catálogos, listas de precios y otros documentos
          </p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Subir Documento
        </Button>
      </div>

      {documents.length === 0 ? (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="text-lg font-semibold mb-2">No hay documentos</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Sube contratos, catálogos y otros documentos importantes
            </p>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Subir Documento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {documents.map((doc) => {
            const isExpired = isDocumentExpired(doc.validUntil)

            return (
              <Card
                key={doc.id}
                style={{ borderColor: 'var(--color-primary)' }}
                className={!doc.isActive || isExpired ? 'opacity-60' : ''}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {getDocumentIcon(doc.mimeType)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{doc.name}</h4>
                            {getDocumentTypeBadge(doc.documentType)}
                            {!doc.isActive && (
                              <Badge variant="secondary">Inactivo</Badge>
                            )}
                            {isExpired && (
                              <Badge variant="destructive">Vencido</Badge>
                            )}
                          </div>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground">{doc.description}</p>
                          )}
                        </div>

                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(doc.fileUrl, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <File className="h-3 w-3" />
                          <span>{doc.fileName}</span>
                        </div>
                        {doc.fileSize && (
                          <div className="flex items-center gap-1">
                            <span>{formatFileSize(doc.fileSize)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Subido: {formatDate(doc.createdAt)}</span>
                        </div>
                        {doc.validFrom && (
                          <div className="flex items-center gap-1">
                            <span>Válido desde: {formatDate(doc.validFrom)}</span>
                          </div>
                        )}
                        {doc.validUntil && (
                          <div className="flex items-center gap-1">
                            <span>
                              Válido hasta: {formatDate(doc.validUntil)}
                              {isExpired && ' (Vencido)'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
