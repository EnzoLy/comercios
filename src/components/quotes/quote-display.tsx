'use client'

import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { Printer, Download, Phone, Mail, MapPin, FileText, ShieldCheck } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

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

interface QuoteData {
  id: string
  quoteNumber: string
  clientName: string
  clientPhone?: string
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  subtotal: number
  tax: number
  discount: number
  total: number
  notes?: string
  createdAt: string
  items: QuoteItem[]
  store: {
    id: string
    name: string
    email?: string
    phone?: string
    address?: string
  }
}

interface QuoteDisplayProps {
  quote: QuoteData
  quoteUrl: string
  hideActions?: boolean
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

export function QuoteDisplay({ quote, quoteUrl, hideActions = false }: QuoteDisplayProps) {
  const handlePrint = () => {
    window.print()
  }

  const formattedDate = new Date(quote.createdAt).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Action Bar - Hidden when printing */}
      {!hideActions && <div className="flex flex-col sm:flex-row items-center justify-between gap-4 no-print bg-card/40 backdrop-blur-xl p-4 sm:p-6 rounded-3xl border border-border shadow-2xl shadow-black/5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight">Presupuesto Digital</h3>
            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground opacity-60">
              Electrónico • Verificado
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={handlePrint} variant="outline" className="flex-1 sm:flex-none h-11 rounded-xl font-bold border-border hover:bg-muted transition-all active:scale-95">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button onClick={handlePrint} className="flex-1 sm:flex-none h-11 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95">
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>}

      {/* Quote Document Canvas */}
      <div id="quote-content" className="bg-card text-card-foreground p-8 md:p-12 shadow-[0_0_50px_-12px_rgba(0,0,0,0.1)] rounded-[2.5rem] border border-border print:shadow-none print:border-none print:p-0 print:rounded-none relative overflow-hidden">

        {/* Subtle Brand Accent (Web only) */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl no-print" />

        {/* Header Section */}
        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8 pb-12 border-b border-border print:pb-4 print:gap-4">
          <div className="space-y-4">
            <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tighter leading-none">
                {quote.store.name}
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                Presupuesto
              </p>
            </div>

            <div className="space-y-2 text-sm font-bold text-muted-foreground">
              {quote.store.address && (
                <p className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-primary/30 shrink-0" />
                  {quote.store.address}
                </p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {quote.store.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-primary/30 shrink-0" />
                    {quote.store.phone}
                  </p>
                )}
                {quote.store.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-primary/30 shrink-0" />
                    {quote.store.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="text-left md:text-right space-y-4">
            <div className="bg-muted/50 p-6 rounded-[2rem] border border-border min-w-[200px]">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">
                Número de Presupuesto
              </h2>
              <p className="text-2xl font-black tracking-tighter text-foreground">
                {quote.quoteNumber}
              </p>
              <Separator className="my-4 opacity-30" />
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Fecha de Emisión
                </p>
                <p className="text-xs font-bold text-foreground uppercase">{formattedDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div className="py-8 print:py-3">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cliente</p>
            <div className="space-y-1">
              <p className="text-lg font-bold text-foreground">{quote.clientName}</p>
              {quote.clientPhone && (
                <p className="text-sm text-muted-foreground">{quote.clientPhone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="py-12 space-y-12 print:py-3 print:space-y-4">
          <div className="overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-border bg-muted/20">
                  <th className="text-left py-4 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Descripción
                  </th>
                  <th className="text-center py-4 px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-20">
                    Cant.
                  </th>
                  <th className="text-right py-4 px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-32">
                    Unitario
                  </th>
                  <th className="text-right py-4 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-32">
                    Importe
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {quote.items.map((item) => (
                  <tr key={item.id} className="group border-b border-border/5 hover:bg-muted/20 transition-colors">
                    <td className="py-6 px-4 print:py-2">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-foreground tracking-tight">{item.name}</div>
                        {item.itemType === 'service' && (
                          <span className="text-[9px] font-bold px-2 py-0.5 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 rounded-full">
                            Servicio
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-center py-6 px-2 print:py-2">
                      <span className="inline-flex items-center justify-center bg-muted text-foreground text-xs font-black rounded-lg h-7 w-7 border border-border/40">
                        {item.quantity}
                      </span>
                    </td>
                    <td className="text-right py-6 px-2 text-sm font-bold text-foreground/70 print:py-2">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="text-right py-6 px-4 print:py-2">
                      <div className="font-black text-foreground tracking-tight">
                        {formatCurrency(item.total)}
                      </div>
                      {item.discount > 0 && (
                        <div className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter mt-1">
                          Desc. -{formatCurrency(item.discount)}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col md:flex-row justify-between gap-12 items-start pt-8 border-t border-border print:gap-4 print:pt-3">
            {/* QR Code */}
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="print-qr bg-white p-4 rounded-[2rem] border border-slate-200 shadow-xl shadow-black/5 flex items-center justify-center print:p-2 print:rounded-xl print:shadow-none">
                <QRCodeSVG
                  value={quoteUrl}
                  size={110}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#000000"
                  includeMargin={true}
                />
              </div>
              <div className="text-center md:text-left space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2 justify-center md:justify-start">
                  Verificar Presupuesto <ShieldCheck className="h-3 w-3 text-emerald-500" />
                </p>
                <p className="text-[9px] text-muted-foreground font-bold max-w-[180px] leading-relaxed">
                  Escanee este código para verificar la autenticidad del presupuesto.
                </p>
              </div>
            </div>

            {/* Financial Summary Column */}
            <div className="w-full md:w-80 space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-black uppercase tracking-widest text-muted-foreground">
                  <span>Subtotal Neto</span>
                  <span className="text-foreground font-black">{formatCurrency(quote.subtotal)}</span>
                </div>

                {quote.tax > 0 && (
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest text-muted-foreground">
                    <span>IVA</span>
                    <span className="text-foreground font-black">{formatCurrency(quote.tax)}</span>
                  </div>
                )}

                {quote.discount > 0 && (
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest text-muted-foreground">
                    <span>Descuento</span>
                    <span className="text-emerald-500 font-black">-{formatCurrency(quote.discount)}</span>
                  </div>
                )}

                <Separator className="opacity-20" />

                <div className="flex justify-between text-lg font-black uppercase tracking-tighter text-foreground">
                  <span>Total</span>
                  <span>{formatCurrency(quote.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="border-t pt-8 space-y-2 print:pt-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Notas</p>
            <p className="text-sm whitespace-pre-wrap text-foreground">{quote.notes}</p>
          </div>
        )}

        {/* Status Badge */}
        <div className="mt-8 flex items-center gap-3 print:mt-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estado:</span>
          <Badge className={statusColors[quote.status as keyof typeof statusColors]}>
            {statusLabels[quote.status as keyof typeof statusLabels]}
          </Badge>
        </div>
      </div>
    </div>
  )
}
