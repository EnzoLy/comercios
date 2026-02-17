import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getStoreContext } from '@/lib/auth/store-context'
import { getDataSource } from '@/lib/db'
import { Sale } from '@/lib/db/entities/sale.entity'
import { DigitalInvoice } from '@/lib/db/entities/digital-invoice.entity'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Receipt, User, CreditCard, Calendar, Clock, Tag, ShoppingBag, FileText, Download, Printer, Share2 } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { SaleActions } from './sale-actions'
import { QRSection } from './qr-section'
import { headers } from 'next/headers'
import { getBaseUrl } from '@/lib/utils/url'

const statusLabels: Record<string, string> = {
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  PENDING: 'Pendiente',
  REFUNDED: 'Reembolsada',
}

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia Bancaria',
  QR: 'QR',
}

export default async function SaleDetailsPage({
  params,
}: {
  params: Promise<{ storeSlug: string; saleId: string }>
}) {
  const { storeSlug, saleId } = await params
  const context = await getStoreContext(storeSlug)

  if (!context) {
    return null
  }

  const dataSource = await getDataSource()
  const saleRepo = dataSource.getRepository(Sale)
  const invoiceRepo = dataSource.getRepository(DigitalInvoice)

  const sale = await saleRepo.findOne({
    where: { id: saleId, storeId: context.storeId },
    relations: ['items', 'items.product', 'cashier'],
  })

  if (!sale) {
    notFound()
  }

  const existingInvoice = await invoiceRepo.findOne({
    where: { saleId: sale.id },
  })

  const headersList = await headers()
  const baseUrl = getBaseUrl({ url: headersList.get('x-url') || `https://${headersList.get('host')}` } as Request)
  const invoiceUrl = existingInvoice ? `${baseUrl}/invoice/${existingInvoice.accessToken}` : null

  return (
    <div id="sale-details-container" className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
      {/* Navigation & Header */}
      <div className="flex flex-col gap-6">
        <Button asChild variant="ghost" size="sm" className="w-fit -ml-2 rounded-xl text-muted-foreground hover:text-primary transition-colors">
          <Link href={`/dashboard/${storeSlug}/sales`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Historial
          </Link>
        </Button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/20 bg-primary/5 text-primary">
                Ticket # {sale.id.substring(0, 8).toUpperCase()}
              </Badge>
              <Badge
                variant={
                  sale.status === 'COMPLETED'
                    ? 'default'
                    : sale.status === 'CANCELLED'
                      ? 'destructive'
                      : 'secondary'
                }
                className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 border-none ${sale.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-600' :
                  sale.status === 'CANCELLED' ? 'bg-destructive/20 text-destructive' : ''
                  }`}
              >
                {statusLabels[sale.status] || sale.status}
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Detalle de Venta
            </h1>
          </div>

          <SaleActions
            saleId={sale.id}
            storeId={context.storeId}
            existingInvoice={existingInvoice ? {
              id: existingInvoice.id,
              accessToken: existingInvoice.accessToken,
              invoiceNumber: existingInvoice.invoiceNumber,
            } : null}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Line Items & Summary */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-none bg-card/40 backdrop-blur-xl shadow-xl shadow-slate-950/5 overflow-hidden">
            <CardHeader className="px-6 py-6 border-b border-border/40 bg-muted/30">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Artículos Vendidos ({sale.items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/10 border-b border-border/40">
                      <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-500 py-4 px-6">Producto</th>
                      <th className="text-center text-[10px] font-black uppercase tracking-widest text-slate-500 py-4 px-6">Cant.</th>
                      <th className="text-right text-[10px] font-black uppercase tracking-widest text-slate-500 py-4 px-6">P. Unit</th>
                      <th className="text-right text-[10px] font-black uppercase tracking-widest text-slate-500 py-4 px-6">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {sale.items?.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold tracking-tight">{item.productName}</span>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{item.productSku}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <Badge variant="secondary" className="bg-muted border-none font-black text-xs h-6 px-2 min-w-[24px] justify-center">
                            {item.quantity}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 text-right text-sm font-medium">
                          ${Number(item.unitPrice).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6 text-right font-black tracking-tight text-sm">
                          ${Number(item.total).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          {item.discount > 0 && (
                            <span className="block text-[9px] text-destructive font-bold uppercase">
                              Desc: -${Number(item.discount).toFixed(2)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Totals Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none bg-muted/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Notas Internas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  {sale.notes || "Sin observaciones registradas para esta venta."}
                </p>
              </CardContent>
            </Card>

            <Card className="border-none bg-primary/5 border border-primary/10">
              <CardContent className="p-6 space-y-3">
                <div className="flex justify-between text-xs font-black uppercase tracking-widest text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="text-foreground font-black">${Number(sale.subtotal).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs font-black uppercase tracking-widest text-muted-foreground">
                  <span>Impuesto</span>
                  <span className="text-foreground font-black">${Number(sale.tax).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                </div>
                {sale.discount > 0 && (
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest text-destructive">
                    <span>Descuento Aplicado</span>
                    <span>-${Number(sale.discount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <Separator className="bg-primary/20" />
                <div className="flex justify-between text-2xl font-black tracking-tight text-primary">
                  <span>Total</span>
                  <span>${Number(sale.total).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Metadata & Payment */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none bg-card/40 backdrop-blur-xl shadow-xl shadow-slate-950/5 overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Información de Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/40">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Método</span>
                <Badge variant="outline" className="font-black uppercase text-[10px] bg-background border-border">
                  {paymentMethodLabels[sale.paymentMethod] || sale.paymentMethod}
                </Badge>
              </div>

              {sale.paymentMethod === 'CASH' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-black px-1">
                    <span className="text-muted-foreground uppercase">Entregado</span>
                    <span className="font-black text-foreground">${Number(sale.amountPaid).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-black px-1 text-emerald-500">
                    <span className="uppercase">Cambio</span>
                    <span className="font-black">${Number(sale.change || 0).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none bg-card/40 backdrop-blur-xl shadow-xl shadow-slate-950/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Registro Temporal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 italic">Fecha y Hora</p>
                  <p className="text-sm font-bold tracking-tight text-foreground">{new Date(sale.createdAt).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}</p>
                </div>
              </div>

              <Separator className="bg-border/40" />

              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 italic">Emitido por</p>
                  <p className="text-sm font-bold tracking-tight text-foreground">{sale.cashier?.name || 'Sistema Central'}</p>
                </div>
              </div>

              {sale.customerName && (
                <>
                  <Separator className="bg-border/40" />
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 italic">Cliente</p>
                      <p className="text-sm font-bold tracking-tight text-foreground">{sale.customerName}</p>
                      {sale.customerEmail && <p className="text-xs text-muted-foreground italic font-bold mt-0.5">{sale.customerEmail}</p>}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <QRSection invoiceUrl={invoiceUrl} />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          
          #sale-details-container {
            width: 100%;
            max-width: none;
            padding: 0;
            margin: 0;
          }

          .Card, .CardContent {
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            padding: 10px 0 !important;
          }

          /* Force text to black for all elements to avoid missing values */
          * {
            color: #000 !important;
            background-color: transparent !important;
            opacity: 1 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Restore white background for the whole page */
          body, #sale-details-container {
            background-color: white !important;
          }

          /* Ensure table headers are visible */
          th {
            border-bottom: 2px solid #000 !important;
            background: #eee !important;
          }

          /* Ensure table rows are visible */
          tr {
            border-bottom: 1px solid #ddd !important;
          }

          @page {
            margin: 1cm;
            size: A4;
          }
        }
      ` }} />
    </div>
  )
}
