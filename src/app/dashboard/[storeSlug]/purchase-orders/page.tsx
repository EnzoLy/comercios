import Link from 'next/link'
import { getStoreContext } from '@/lib/auth/store-context'
import { getDataSource } from '@/lib/db'
import { PurchaseOrder, PurchaseOrderStatus } from '@/lib/db/entities/purchase-order.entity'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, ClipboardList, Package, Truck, Calendar, ShoppingCart, ArrowRight, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { cn } from '@/lib/utils'

export default async function PurchaseOrdersPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>
}) {
  const { storeSlug } = await params
  const context = await getStoreContext(storeSlug)

  if (!context) {
    return null
  }

  const dataSource = await getDataSource()
  const poRepo = dataSource.getRepository(PurchaseOrder)

  const purchaseOrders = await poRepo.find({
    where: { storeId: context.storeId },
    relations: ['supplier'],
    order: { orderDate: 'DESC' },
  })

  // Calculate stats
  const activeOrders = purchaseOrders.filter(
    (po) =>
      po.status === PurchaseOrderStatus.SENT ||
      po.status === PurchaseOrderStatus.CONFIRMED ||
      po.status === PurchaseOrderStatus.PARTIALLY_RECEIVED
  )

  // Get current month orders
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthOrders = purchaseOrders.filter(
    (po) => new Date(po.orderDate) >= startOfMonth
  )
  const thisMonthTotal = thisMonthOrders.reduce(
    (sum, po) => sum + Number(po.totalAmount),
    0
  )

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case PurchaseOrderStatus.DRAFT:
        return (
          <Badge variant="outline" className="bg-slate-500/10 text-slate-500 border-slate-500/20 font-bold uppercase tracking-tighter">
            <Clock className="h-3 w-3 mr-1" /> Borrador
          </Badge>
        )
      case PurchaseOrderStatus.SENT:
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 font-bold uppercase tracking-tighter">
            <Truck className="h-3 w-3 mr-1" /> Enviado
          </Badge>
        )
      case PurchaseOrderStatus.CONFIRMED:
        return (
          <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 font-bold uppercase tracking-tighter">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Confirmado
          </Badge>
        )
      case PurchaseOrderStatus.PARTIALLY_RECEIVED:
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold uppercase tracking-tighter">
            <Package className="h-3 w-3 mr-1" /> Parcial
          </Badge>
        )
      case PurchaseOrderStatus.RECEIVED:
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold uppercase tracking-tighter">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Recibido
          </Badge>
        )
      case PurchaseOrderStatus.CANCELLED:
        return (
          <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/20 font-bold uppercase tracking-tighter">
            <XCircle className="h-3 w-3 mr-1" /> Cancelado
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date))
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
            Órdenes de <span className="gradient-text">Compra</span>
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Gestiona el abastecimiento y las relaciones con tus proveedores.
          </p>
        </div>
        <Button asChild className="rounded-xl h-11 px-6 font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-[0.98]">
          <Link href={`/dashboard/${storeSlug}/purchase-orders/new`}>
            <Plus className="mr-2 h-5 w-5" />
            Nueva Orden
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="group relative overflow-hidden border-none bg-slate-800/50 backdrop-blur-md text-foreground border border-white/10 shadow-lg">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
            <ClipboardList className="h-24 w-24" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-60">Total Órdenes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black">{purchaseOrders.length}</div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">Historial acumulado</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-none bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Truck className="h-24 w-24" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-white/80">Órdenes Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black">{activeOrders.length}</div>
            <p className="text-xs text-white/60 mt-2 font-medium">En proceso de entrega</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-none bg-primary text-white shadow-lg shadow-primary/20">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Package className="h-24 w-24" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-white/80">Inversión del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black">{formatCurrency(thisMonthTotal)}</div>
            <p className="text-xs text-white/60 mt-2 font-medium">Acumulado en {new Date().toLocaleDateString('es-ES', { month: 'long' })}</p>
          </CardContent>
        </Card>
      </div>

      {purchaseOrders.length === 0 ? (
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm border border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-24 w-24 rounded-full bg-secondary/50 flex items-center justify-center mb-6">
              <ClipboardList className="h-12 w-12 text-muted-foreground opacity-20" />
            </div>
            <h3 className="text-xl font-bold mb-2 tracking-tight">Aún no hay órdenes registradas</h3>
            <p className="text-muted-foreground max-w-sm mb-8">
              Tu historial de abastecimiento aparecerá aquí una vez que crees tu primera orden de compra.
            </p>
            <Button asChild size="lg" className="rounded-xl h-12 px-8 font-bold">
              <Link href={`/dashboard/${storeSlug}/purchase-orders/new`}>
                <Plus className="mr-2 h-5 w-5" />
                Crear Primera Orden
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm border border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-xl font-bold">Historial de Adquisiciones</CardTitle>
              <CardDescription>Monitorea el estado de tus reposiciones</CardDescription>
            </div>
            <Badge variant="outline" className="px-3 py-1 font-black rounded-lg uppercase tracking-tighter">
              {purchaseOrders.length} Registros
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-4 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">ID Orden</th>
                    <th className="text-left py-4 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Proveedor</th>
                    <th className="text-left py-4 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Lanzamiento</th>
                    <th className="text-left py-4 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Promesa Entrega</th>
                    <th className="text-center py-4 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estado</th>
                    <th className="text-right py-4 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Inversión</th>
                    <th className="text-right py-4 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {purchaseOrders.map((po) => (
                    <tr
                      key={po.id}
                      className="group hover:bg-secondary/20 transition-all duration-300"
                    >
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-black text-sm">{po.orderNumber}</span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Ref: #{po.id.substring(0, 8)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center text-primary font-black text-xs uppercase">
                            {po.supplier?.name.charAt(0)}
                          </div>
                          <span className="font-bold text-sm tracking-tight">{po.supplier?.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold font-mono">{formatDate(po.orderDate)}</span>
                          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">Emitida</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {po.expectedDeliveryDate ? (
                          <div className="flex flex-col">
                            <span className="text-xs font-bold font-mono text-indigo-500">{formatDate(po.expectedDeliveryDate)}</span>
                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Pendiente
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/30 font-black">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {getStatusBadge(po.status)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-base font-black tabular-nums">
                          {formatCurrency(Number(po.totalAmount))}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl hover:bg-primary/20 hover:text-primary transition-all group-hover:translate-x-1"
                        >
                          <Link href={`/dashboard/${storeSlug}/purchase-orders/${po.id}`}>
                            <ArrowRight className="h-5 w-5" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
