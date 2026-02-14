'use client'

import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { SaleInvoiceButton } from './invoice-button'

interface SaleActionsProps {
  saleId: string
  storeId: string
  existingInvoice: {
    id: string
    accessToken: string
    invoiceNumber?: string
  } | null
}

export function SaleActions({ saleId, storeId, existingInvoice }: SaleActionsProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex items-center gap-3 no-print">
      <Button
        variant="outline"
        className="h-11 rounded-xl font-bold border-border/50 bg-background/50 shadow-sm active:scale-95 transition-all"
        onClick={handlePrint}
      >
        <Printer className="mr-2 h-4 w-4" />
        Imprimir
      </Button>
      <SaleInvoiceButton
        saleId={saleId}
        storeId={storeId}
        existingInvoice={existingInvoice}
      />
    </div>
  )
}
