'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer, Download, Edit, Trash2, Copy, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { QRCodeSVG } from 'qrcode.react'
import { QuoteDisplay } from '@/components/quotes/quote-display'

interface QuoteItem {
  id: string
  name: string
  itemType: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
  taxRate: number
  taxAmount: number
}

interface Quote {
  id: string
  quoteNumber: string
  clientName: string
  clientPhone?: string
  clientEmail?: string
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  subtotal: number
  tax: number
  discount: number
  total: number
  notes?: string
  expiresAt?: string
  createdAt: string
  accessToken: string
  items: QuoteItem[]
}

interface StoreInfo {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  SENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  EXPIRED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
}

const statusLabels = {
  DRAFT: 'Borrador',
  SENT: 'Enviado',
  ACCEPTED: 'Aceptado',
  REJECTED: 'Rechazado',
  EXPIRED: 'Vencido',
}

export default function QuoteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const storeSlug = params.storeSlug as string
  const quoteId = params.quoteId as string
  const [storeId, setStoreId] = useState<string>('')
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [newStatus, setNewStatus] = useState<string>('DRAFT')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showQrDialog, setShowQrDialog] = useState(false)
  const [publicUrl, setPublicUrl] = useState<string>('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const storeRes = await fetch(`/api/stores?slug=${storeSlug}`)
        const storeData = await storeRes.json()
        const store = storeData[0]
        const actualStoreId = store?.id
        setStoreId(actualStoreId)
        setStoreInfo(store ?? null)

        const quoteRes = await fetch(`/api/stores/${actualStoreId}/quotes/${quoteId}`)
        const quoteData: Quote = await quoteRes.json()
        setQuote(quoteData)
        setNewStatus(quoteData.status)

        const baseUrl = window.location.origin
        setPublicUrl(`${baseUrl}/quote/${quoteData.accessToken}`)
      } catch (error) {
        console.error('Failed to fetch quote:', error)
      } finally {
        setLoading(false)
      }
    }

    if (storeSlug) fetchData()
  }, [storeSlug, quoteId])

  const handleStatusChange = async () => {
    if (!quote || newStatus === quote.status) return

    try {
      const res = await fetch(`/api/stores/${storeId}/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) throw new Error('Failed to update quote')
      const updated: Quote = await res.json()
      setQuote(updated)
    } catch (error) {
      console.error('Failed to update quote status:', error)
      toast.error('Error al actualizar el estado')
    }
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/stores/${storeId}/quotes/${quoteId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete quote')
      router.push(`/dashboard/${storeSlug}/quotes`)
    } catch (error) {
      console.error('Failed to delete quote:', error)
      toast.error('Error al eliminar el presupuesto')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center py-12">Cargando...</div>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center py-12">Presupuesto no encontrado</div>
      </div>
    )
  }

  const expiresAt = quote.expiresAt ? new Date(quote.expiresAt) : null
  const isExpired = expiresAt && expiresAt < new Date()

  const quoteWithStore = {
    ...quote,
    store: storeInfo ?? { id: storeId, name: '' },
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back link - hidden during print */}
        <div className="no-print">
          <Link
            href={`/dashboard/${storeSlug}/quotes`}
            className="inline-flex items-center gap-2 mb-6 text-sm font-medium hover:opacity-80"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Presupuestos
          </Link>
        </div>

        <div className="space-y-6">
          {/* Header with Actions - hidden during print */}
          <div className="no-print flex justify-between items-start gap-4 flex-col md:flex-row">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">{quote.quoteNumber}</h1>
              <Badge className={statusColors[quote.status as keyof typeof statusColors]}>
                {statusLabels[quote.status as keyof typeof statusLabels]}
              </Badge>
              {expiresAt && (
                <p className={`text-sm ${isExpired ? 'text-red-600' : 'text-muted-foreground'}`}>
                  Vencimiento: {expiresAt.toLocaleDateString('es-AR')}
                  {isExpired && ' (Vencido)'}
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-col md:flex-row w-full md:w-auto">
              <Button onClick={handlePrint} variant="outline" className="gap-2">
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
              <Button onClick={handlePrint} className="gap-2">
                <Download className="h-4 w-4" />
                PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/${storeSlug}/quotes/${quoteId}/edit`)}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Editar
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowQrDialog(true)}
                className="gap-2"
              >
                <QrCode className="h-4 w-4" />
                QR
              </Button>
            </div>
          </div>

          {/* Status Update - hidden during print */}
          <div className="no-print border rounded-lg p-4 bg-card">
            <div className="flex items-center gap-4 justify-between flex-col md:flex-row">
              <p className="text-sm font-medium text-muted-foreground">Cambiar Estado</p>
              <div className="flex gap-2 w-full md:w-auto">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Borrador</SelectItem>
                    <SelectItem value="SENT">Enviado</SelectItem>
                    <SelectItem value="ACCEPTED">Aceptado</SelectItem>
                    <SelectItem value="REJECTED">Rechazado</SelectItem>
                    <SelectItem value="EXPIRED">Vencido</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleStatusChange}
                  disabled={newStatus === quote.status}
                  variant="outline"
                >
                  Actualizar
                </Button>
              </div>
            </div>
          </div>

          {/* Quote Display - same design as public /quote/[token] view */}
          <QuoteDisplay
            quote={quoteWithStore}
            quoteUrl={publicUrl}
            hideActions
          />

          {/* Delete Button - hidden during print */}
          <div className="no-print flex justify-end">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar Presupuesto
            </Button>
          </div>
        </div>

        {/* QR Dialog */}
        <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Compartir Presupuesto</DialogTitle>
              <DialogDescription>
                Comparte este presupuesto con tu cliente usando el código QR o el enlace
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg border">
                <QRCodeSVG
                  value={publicUrl}
                  size={200}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#000000"
                  includeMargin={true}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Enlace público:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={publicUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border rounded-lg bg-muted text-sm font-mono"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(publicUrl)
                      toast.success('Enlace copiado al portapapeles')
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogTitle>Eliminar Presupuesto</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este presupuesto? Esta acción no se puede deshacer.
            </AlertDialogDescription>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600">
                Eliminar
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
