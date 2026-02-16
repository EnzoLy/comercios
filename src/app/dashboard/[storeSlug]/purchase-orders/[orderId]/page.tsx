import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { getStoreContext } from '@/lib/auth/store-context'
import { getDataSource } from '@/lib/db'
import { PurchaseOrder, PurchaseOrderStatus } from '@/lib/db/entities/purchase-order.entity'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Package, Calendar, Truck, FileText, CheckCircle2, Clock, XCircle, ChevronRight, Hash, Receipt, ExternalLink } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { ReceiveMerchandiseDialog } from '@/components/purchase-orders/receive-merchandise-dialog'
import { CancelOrderButton } from '@/components/purchase-orders/cancel-order-button'
import { cn } from '@/lib/utils'

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ storeSlug: string; orderId: string }>
}) {
  const { storeSlug, orderId } = await params
  const context = await getStoreContext(storeSlug)

  if (!context) {
    return null
  }

  const dataSource = await getDataSource()
  const poRepo = dataSource.getRepository(PurchaseOrder)

  // Fetch purchase order with all relations
  const purchaseOrder = await poRepo.findOne({
    where: { id: orderId, storeId: context.storeId },
    relations: ['supplier', 'items', 'items.product'],
  })

  if (!purchaseOrder) {
    notFound()
  }

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case PurchaseOrderStatus.DRAFT:
        return (
          <Badge variant="outline" className="bg-slate-500/10 text-slate-500 border-slate-500/20 font-bold uppercase tracking-tighter px-3">
            <Clock className="h-3 w-3 mr-1.5" /> Borrador
          </Badge>
        )
      case PurchaseOrderStatus.SENT:
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 font-bold uppercase tracking-tighter px-3">
            <Truck className="h-3 w-3 mr-1.5" /> Enviado
          </Badge>
        )
      case PurchaseOrderStatus.CONFIRMED:
        return (
          <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 font-bold uppercase tracking-tighter px-3">
            <CheckCircle2 className="h-3 w-3 mr-1.5" /> Confirmado
          </Badge>
        )
      case PurchaseOrderStatus.PARTIALLY_RECEIVED:
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold uppercase tracking-tighter px-3">
            <Package className="h-3 w-3 mr-1.5" /> Parcialmente Recibido
          </Badge>
        )
      case PurchaseOrderStatus.RECEIVED:
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold uppercase tracking-tighter px-3">
            <CheckCircle2 className="h-3 w-3 mr-1.5" /> Recibido
          </Badge>
        )
      case PurchaseOrderStatus.CANCELLED:
        return (
          <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/20 font-bold uppercase tracking-tighter px-3">
            <XCircle className="h-3 w-3 mr-1.5" /> Cancelado
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date))
  }

  const canEdit =
    purchaseOrder.status === PurchaseOrderStatus.DRAFT ||
    purchaseOrder.status === PurchaseOrderStatus.SENT

  const canReceive =
    purchaseOrder.status === PurchaseOrderStatus.SENT ||
    purchaseOrder.status === PurchaseOrderStatus.CONFIRMED ||
    purchaseOrder.status === PurchaseOrderStatus.PARTIALLY_RECEIVED

  const canCancel =
    purchaseOrder.status === PurchaseOrderStatus.DRAFT ||
    purchaseOrder.status === PurchaseOrderStatus.SENT

  // Serialize for Client Component
  const serializedPO = JSON.parse(JSON.stringify(purchaseOrder))

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Link href={`/dashboard/${storeSlug}/purchase-orders`} className="hover:text-primary transition-colors">Órdenes de Compra</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-bold text-foreground">{purchaseOrder.orderNumber}</span>
      </div>

      {/* Hero Section / Header */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/20 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
                {purchaseOrder.orderNumber}
              </h1>
              {getStatusBadge(purchaseOrder.status)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Proveedor</p>
                  <Link
                    href={`/dashboard/${storeSlug}/suppliers/${purchaseOrder.supplier.id}`}
                    className="text-lg font-bold hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {purchaseOrder.supplier.name}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
                  <Calendar className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Emisión</p>
                  <p className="text-lg font-bold italic opacity-90">{formatDate(purchaseOrder.orderDate)}</p>
                </div>
              </div>

              {(purchaseOrder.expectedDeliveryDate || purchaseOrder.actualDeliveryDate) && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
                    <Truck className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
                      {purchaseOrder.actualDeliveryDate ? 'Recibido el' : 'Entrega Estimada'}
                    </p>
                    <p className="text-lg font-bold italic opacity-90">
                      {formatDate(purchaseOrder.actualDeliveryDate || purchaseOrder.expectedDeliveryDate!)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {canReceive && (
              <ReceiveMerchandiseDialog
                purchaseOrder={serializedPO}
                storeSlug={storeSlug}
              />
            )}
            {canEdit && (
              <Button asChild variant="secondary" className="rounded-xl h-11 px-6 font-bold">
                <Link href={`/dashboard/${storeSlug}/purchase-orders/${orderId}/edit`}>
                  Editar Orden
                </Link>
              </Button>
            )}
            {canCancel && (
              <CancelOrderButton
                orderId={orderId}
                storeSlug={storeSlug}
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden rounded-3xl">
            <CardHeader className="bg-secondary/20 border-b border-border">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl font-bold">Detalle de Productos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-secondary/10">
                      <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Producto</th>
                      <th className="text-center py-4 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pedido</th>
                      <th className="text-center py-4 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recibido</th>
                      <th className="text-right py-4 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Precio Unit.</th>
                      <th className="text-right py-4 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {purchaseOrder.items?.map((item) => {
                      const itemTotal =
                        item.quantityOrdered * Number(item.unitPrice) *
                        (1 - Number(item.discountPercentage) / 100)

                      return (
                        <tr key={item.id} className="group hover:bg-secondary/10 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-start gap-3">
                              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center font-black text-xs text-muted-foreground">
                                {item.product?.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-sm tracking-tight">{item.product?.name}</p>
                                <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60">SKU: {item.product?.sku}</p>
                                {item.notes && (
                                  <p className="text-[10px] text-primary/70 font-bold mt-1.5 flex items-center gap-1 italic">
                                    <FileText className="h-3 w-3" /> {item.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="font-mono font-black text-sm">{item.quantityOrdered}</span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className={cn(
                              "inline-flex items-center justify-center px-3 py-1 rounded-lg font-black font-mono text-sm",
                              item.quantityReceived === item.quantityOrdered ? "bg-emerald-500/10 text-emerald-500" :
                                item.quantityReceived > 0 ? "bg-amber-500/10 text-amber-500 shadow-inner" : "bg-secondary text-muted-foreground/50"
                            )}>
                              {item.quantityReceived}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="text-sm font-medium opacity-70 italic">{formatCurrency(Number(item.unitPrice))}</span>
                            {item.discountPercentage > 0 && (
                              <p className="text-[10px] font-black text-rose-500 uppercase">-{item.discountPercentage}% Off</p>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className="text-base font-black tabular-nums">{formatCurrency(itemTotal)}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          {purchaseOrder.notes && (
            <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm rounded-3xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Notas de la Orden
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium leading-relaxed opacity-80 whitespace-pre-wrap">{purchaseOrder.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Summary */}
        <div className="space-y-6">
          <Card className="border-none shadow-2xl bg-indigo-600 text-white rounded-[2.5rem] overflow-hidden sticky top-8">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Hash className="h-32 w-32" />
            </div>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold border-b border-white/20 pb-4">Resumen Económico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center opacity-80">
                  <span className="text-sm font-bold uppercase tracking-tighter">Subtotal</span>
                  <span className="font-mono font-black">{formatCurrency(Number(purchaseOrder.subtotal))}</span>
                </div>

                {purchaseOrder.taxAmount && Number(purchaseOrder.taxAmount) > 0 && (
                  <div className="flex justify-between items-center opacity-80">
                    <span className="text-sm font-bold uppercase tracking-tighter">Impuestos</span>
                    <span className="font-mono font-black">+{formatCurrency(Number(purchaseOrder.taxAmount))}</span>
                  </div>
                )}

                {purchaseOrder.shippingCost && Number(purchaseOrder.shippingCost) > 0 && (
                  <div className="flex justify-between items-center opacity-80">
                    <span className="text-sm font-bold uppercase tracking-tighter">Costo Envío</span>
                    <span className="font-mono font-black">+{formatCurrency(Number(purchaseOrder.shippingCost))}</span>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-white/20 flex flex-col gap-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Total de Inversión</p>
                <div className="text-4xl font-black tabular-nums tracking-tighter">
                  {formatCurrency(Number(purchaseOrder.totalAmount))}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Artículos</p>
                  <p className="text-lg font-black">{purchaseOrder.items?.length || 0} Variedades</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
