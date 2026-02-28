'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Printer, RotateCcw } from 'lucide-react'
import { SaleInvoiceButton } from './invoice-button'
import { ReturnDialog } from './return-dialog'
import { SaleItemData } from '@/types'

interface SaleActionsProps {
  saleId: string
  storeId: string
  saleStatus: string
  saleItems: SaleItemData[]
  existingInvoice: {
    id: string
    accessToken: string
    invoiceNumber?: string
  } | null
}

export function SaleActions({ saleId, storeId, saleStatus, saleItems, existingInvoice }: SaleActionsProps) {
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)

  const handlePrint = () => {
    window.print()
  }

  const canReturn =
    saleStatus === 'COMPLETED' || saleStatus === 'PARTIALLY_REFUNDED'

  return (
    <>
      <div className="flex items-center gap-3 no-print">
        <Button
          variant="outline"
          className="h-11 rounded-xl font-bold border-border bg-background/50 shadow-sm active:scale-95 transition-all"
          onClick={handlePrint}
        >
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>

        {canReturn && (
          <Button
            variant="outline"
            className="h-11 rounded-xl font-bold border-amber-500/40 bg-amber-500/5 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 shadow-sm active:scale-95 transition-all"
            onClick={() => setReturnDialogOpen(true)}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Procesar Devolución
          </Button>
        )}

        <SaleInvoiceButton
          saleId={saleId}
          storeId={storeId}
          existingInvoice={existingInvoice}
        />
      </div>

      <ReturnDialog
        open={returnDialogOpen}
        onOpenChange={setReturnDialogOpen}
        storeId={storeId}
        saleId={saleId}
        items={saleItems}
      />
    </>
  )
}
