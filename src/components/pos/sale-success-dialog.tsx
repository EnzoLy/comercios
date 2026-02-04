'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import { CheckCircle, ExternalLink, Copy, QrCode } from 'lucide-react'
import { toast } from 'sonner'
import QRCodeLib from 'qrcode'

interface SaleSuccessDialogProps {
  isOpen: boolean
  onClose: () => void
  sale: {
    id: string
    total: number
    invoiceUrl?: string
  } | null
}

export function SaleSuccessDialog({
  isOpen,
  onClose,
  sale,
}: SaleSuccessDialogProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')

  useEffect(() => {
    if (sale?.invoiceUrl) {
      generateQRCode(sale.invoiceUrl)
    }
  }, [sale?.invoiceUrl])

  const generateQRCode = async (url: string) => {
    try {
      const dataUrl = await QRCodeLib.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
      setQrCodeDataUrl(dataUrl)
    } catch (err) {
      console.error('Error generating QR code:', err)
    }
  }

  const handleCopyLink = () => {
    if (sale?.invoiceUrl) {
      navigator.clipboard.writeText(sale.invoiceUrl)
      toast.success('Enlace copiado al portapapeles')
    }
  }

  const handleOpenInvoice = () => {
    if (sale?.invoiceUrl) {
      window.open(sale.invoiceUrl, '_blank')
    }
  }

  if (!sale) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <DialogTitle className="text-center text-2xl">
            ¡Venta Completada!
          </DialogTitle>
          <DialogDescription className="text-center text-lg pt-2">
            Total: {formatCurrency(sale.total)}
          </DialogDescription>
        </DialogHeader>

        {sale.invoiceUrl && (
          <div className="space-y-4 py-4">
            {/* QR Code */}
            {qrCodeDataUrl && (
              <div className="flex flex-col items-center space-y-2">
                <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code de la factura"
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-sm text-gray-600 text-center">
                  Escanea para ver la factura digital
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleOpenInvoice}
                className="w-full"
                size="lg"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Ver Factura Digital
              </Button>
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="w-full"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiar Enlace
              </Button>
            </div>

            {/* URL Display */}
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
              <p className="text-xs text-gray-600 dark:text-gray-400 break-all">
                {sale.invoiceUrl}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
