'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import QRCode from 'qrcode'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { QrCode, Download, Copy, Loader2 } from 'lucide-react'

interface GenerateQRDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  employmentId: string
  storeId: string
}

export function GenerateQRDialog({
  isOpen,
  onOpenChange,
  employmentId,
  storeId,
}: GenerateQRDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch(
        `/api/stores/${storeId}/employments/${employmentId}/generate-access-token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employmentId,
            expiresInHours: 24,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Error al generar código QR')
        return
      }

      // Generate QR image
      const qrImage = await QRCode.toDataURL(result.data.qrUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })

      setQrDataUrl(qrImage)
      setQrUrl(result.data.qrUrl)
      setExpiresAt(new Date(result.data.expiresAt).toLocaleString('es-ES'))
      toast.success('Código QR generado exitosamente')
    } catch (error) {
      console.error('Generate QR error:', error)
      toast.error('Error al generar código QR')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!qrDataUrl) return
    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = `codigo-qr-acceso.png`
    link.click()
    toast.success('Código QR descargado')
  }

  const handleCopyLink = () => {
    if (!qrUrl) return
    navigator.clipboard.writeText(qrUrl)
    toast.success('Enlace copiado al portapapeles')
  }

  const handleClose = () => {
    setQrDataUrl(null)
    setQrUrl(null)
    setExpiresAt(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="flex items-center justify-center gap-2">
            <QrCode className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
            Mi Código QR de Acceso
          </DialogTitle>
          <DialogDescription className="text-center">
            Escanea este código con tu móvil para acceder rápidamente (válido por 24 horas)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!qrDataUrl ? (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Se generará un código QR que expira en 24 horas. Si generas uno nuevo, el anterior se desactivará automáticamente.
              </p>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 h-4 w-4" />
                    Generar Mi Código QR
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-lg border-2" style={{ borderColor: 'var(--color-primary)' }}>
                  <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
                </div>

                <div className="text-center space-y-1 w-full">
                  <p className="text-sm font-semibold">Código activo</p>
                  <p className="text-xs text-gray-500">Expira: {expiresAt}</p>
                </div>

                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    onClick={handleCopyLink}
                    className="flex-1"
                    size="sm"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar Link
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownload}
                    className="flex-1"
                    size="sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar
                  </Button>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-800 dark:text-blue-300 text-center">
                  💡 Comparte el código o el enlace con tu dispositivo móvil para acceder sin necesidad de login
                </div>

                <Button
                  onClick={handleClose}
                  className="w-full"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  size="sm"
                >
                  Listo
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
