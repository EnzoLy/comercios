'use client'

import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import { Download, Printer, ShieldCheck, Mail, Phone, MapPin, Receipt, Share2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface InvoiceItem {
  id: string
  productName: string
  productSku?: string
  quantity: number
  unitPrice: number
  discount: number
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
}

interface InvoiceData {
  id: string
  invoiceNumber?: string
  createdAt: string
  sale: {
    id: string
    paymentMethod: string
    subtotal: number
    tax: number
    discount: number
    total: number
    completedAt?: string
    items: InvoiceItem[]
  }
  store: {
    id: string
    name: string
    email?: string
    phone?: string
    address?: string
  }
}

interface InvoiceDisplayProps {
  invoice: InvoiceData
  invoiceUrl: string
}

export function InvoiceDisplay({ invoice, invoiceUrl }: InvoiceDisplayProps) {
  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = () => {
    // Both use the browser's print engine which is the most reliable way 
    // to generate a high-quality PDF or physical print from the DOM
    window.print()
  }

  const paymentMethodLabels: Record<string, string> = {
    CASH: 'Efectivo',
    CARD: 'Tarjeta',
    MOBILE: 'Pago Móvil',
    CREDIT: 'Crédito',
  }

  const formattedDate = new Date(
    invoice.sale.completedAt || invoice.createdAt
  ).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Premium Action Bar - Hidden when printing */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 no-print bg-card/40 backdrop-blur-xl p-4 sm:p-6 rounded-3xl border border-border/50 shadow-2xl shadow-black/5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight">Comprobante Digital</h3>
            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground opacity-60">Electrónico • Verificado</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={handlePrint} variant="outline" className="flex-1 sm:flex-none h-11 rounded-xl font-bold border-border/50 hover:bg-muted transition-all active:scale-95">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button onClick={handleDownloadPDF} className="flex-1 sm:flex-none h-11 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95">
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Invoice Document Canvas */}
      <div id="invoice-content" className="bg-card text-card-foreground p-8 md:p-12 shadow-[0_0_50px_-12px_rgba(0,0,0,0.1)] rounded-[2.5rem] border border-border print:shadow-none print:border-none print:p-0 print:rounded-none relative overflow-hidden">

        {/* Subtle Brand Accent (Web only) */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl no-print" />

        {/* Header Section */}
        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8 pb-12 border-b border-border/50">
          <div className="space-y-4">
            <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tighter leading-none">
                {invoice.store.name}
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Comercio Registrado</p>
            </div>

            <div className="space-y-2 text-sm font-bold text-muted-foreground">
              {invoice.store.address && (
                <p className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-primary/30 shrink-0" />
                  {invoice.store.address}
                </p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {invoice.store.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-primary/30 shrink-0" />
                    {invoice.store.phone}
                  </p>
                )}
                {invoice.store.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-primary/30 shrink-0" />
                    {invoice.store.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="text-left md:text-right space-y-4">
            <div className="bg-muted/50 p-6 rounded-[2rem] border border-border min-w-[200px]">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">Folio de Factura</h2>
              <p className="text-2xl font-black tracking-tighter text-foreground">
                {invoice.invoiceNumber || `TX-${invoice.id.substring(0, 8).toUpperCase()}`}
              </p>
              <Separator className="my-4 opacity-30" />
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fecha de Emisión</p>
                <p className="text-xs font-bold text-foreground uppercase">{formattedDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="py-12 space-y-12">
          <div className="overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-border bg-muted/20">
                  <th className="text-left py-4 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Servicio / Producto</th>
                  <th className="text-center py-4 px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-20">Cant.</th>
                  <th className="text-right py-4 px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-32">Unitario</th>
                  <th className="text-right py-4 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-32">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {invoice.sale.items.map((item) => (
                  <tr key={item.id} className="group border-b border-border/5 hover:bg-muted/20 transition-colors">
                    <td className="py-6 px-4">
                      <div className="font-bold text-foreground tracking-tight">{item.productName}</div>
                      {item.productSku && (
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter mt-1">SKU: {item.productSku}</div>
                      )}
                    </td>
                    <td className="text-center py-6 px-2">
                      <span className="inline-flex items-center justify-center bg-muted text-foreground text-xs font-black rounded-lg h-7 w-7 border border-border/40">
                        {item.quantity}
                      </span>
                    </td>
                    <td className="text-right py-6 px-2 text-sm font-bold text-foreground/70">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="text-right py-6 px-4">
                      <div className="font-black text-foreground tracking-tight">
                        {formatCurrency(item.subtotal - item.discount)}
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

          <div className="flex flex-col md:flex-row justify-between gap-12 items-start pt-8 border-t border-border/50">
            {/* Authenticity Column */}
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-xl shadow-black/5 flex items-center justify-center">
                <QRCodeSVG
                  value={invoiceUrl}
                  size={140}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#000000"
                  includeMargin={true}
                />
              </div>
              <div className="text-center md:text-left space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2 justify-center md:justify-start">
                  Sello de Integridad <ShieldCheck className="h-3 w-3 text-emerald-500" />
                </p>
                <p className="text-[9px] text-muted-foreground font-bold max-w-[180px] leading-relaxed">
                  Escanee este código para validar la autenticidad de la transacción en nuestro portal oficial.
                </p>
              </div>
            </div>

            {/* Financial Summary Column */}
            <div className="w-full md:w-80 space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-black uppercase tracking-widest text-muted-foreground">
                  <span>Subtotal Neto</span>
                  <span className="text-foreground font-black">{formatCurrency(invoice.sale.subtotal)}</span>
                </div>

                {invoice.sale.tax > 0 && (
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest text-muted-foreground">
                    <span>Carga Impositiva</span>
                    <span className="text-foreground font-black">{formatCurrency(invoice.sale.tax)}</span>
                  </div>
                )}

                {invoice.sale.discount > 0 && (
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                    <span>Descuento Total</span>
                    <span>-{formatCurrency(invoice.sale.discount)}</span>
                  </div>
                )}

                <div className="h-px bg-border/50 my-4" />

                <div className="flex justify-between items-end py-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Total a Pagar</span>
                    <span className="text-xs font-black text-foreground uppercase tracking-tighter italic opacity-60">CANTIDAD EN PESOS</span>
                  </div>
                  <span className="text-4xl font-black tracking-tighter text-foreground leading-none">
                    {formatCurrency(invoice.sale.total)}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pago vía</span>
                <Badge className="bg-primary text-primary-foreground border-none text-[10px] font-black uppercase tracking-widest h-6 rounded-lg px-3">
                  {paymentMethodLabels[invoice.sale.paymentMethod] || invoice.sale.paymentMethod}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Official Footer */}
        <div className="border-t border-border/50 pt-12 mt-12 text-center space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border border-border">
              <Receipt className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs font-black text-foreground uppercase tracking-widest italic">
              "Su confianza es nuestro principal activo"
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">
              Este documento es una representación digital válida de su compra realizada en {formattedDate}
            </p>
            <p className="text-[9px] font-black text-primary/40 break-all select-none lowercase">
              AUTH: {invoiceUrl}
            </p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body {
            background: white !important;
          }
          /* Hide everything first */
          body * {
            visibility: hidden;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Only show the invoice content container and its children */
          #invoice-content, #invoice-content * {
            visibility: visible;
          }
          
          /* Position everything to the top left */
          #invoice-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 2cm;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: #0f172a !important;
          }

          /* Force text black and no backgrounds for indicators */
          #invoice-content h1, 
          #invoice-content h2, 
          #invoice-content p, 
          #invoice-content span, 
          #invoice-content div, 
          #invoice-content td,
          #invoice-content th {
            color: #000 !important;
            background: transparent !important;
            opacity: 1 !important;
          }
          
          #invoice-content .bg-muted, #invoice-content .bg-primary/10 {
            background: transparent !important;
            border-color: #000 !important;
          }

          /* Hide UI elements explicitly */
          .no-print, .print\\:hidden, .no-print * {
            display: none !important;
            height: 0;
            margin: 0;
            padding: 0;
          }

          @page {
            margin: 0;
            size: A4;
          }
        }
      ` }} />
    </div>
  )
}
