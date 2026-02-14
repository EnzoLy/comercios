'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, FileText, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface SaleInvoiceButtonProps {
  saleId: string
  storeId: string
  existingInvoice?: {
    id: string
    accessToken: string
    invoiceNumber?: string
  } | null
}

export function SaleInvoiceButton({ saleId, storeId, existingInvoice }: SaleInvoiceButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [invoice, setInvoice] = useState(existingInvoice)

  const handleGenerateInvoice = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/stores/${storeId}/sales/${saleId}/invoice`,
        { method: 'POST' }
      )

      if (!response.ok) {
        throw new Error('Error al generar factura')
      }

      const data = await response.json()
      setInvoice(data)
      toast.success('Factura generada exitosamente')
    } catch (error) {
      toast.error('Error al generar la factura')
    } finally {
      setIsLoading(false)
    }
  }

  if (invoice) {
    return (
      <Button asChild variant="outline">
        <a href={`/invoice/${invoice.accessToken}`} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-2 h-4 w-4" />
          Ver Factura
        </a>
      </Button>
    )
  }

  return (
    <Button onClick={handleGenerateInvoice} disabled={isLoading} variant="outline">
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <FileText className="mr-2 h-4 w-4" />
      )}
      Generar Factura
    </Button>
  )
}
