import Link from 'next/link'
import { getStoreContext } from '@/lib/auth/store-context'
import { getDataSource } from '@/lib/db'
import { Sale, SaleStatus } from '@/lib/db/entities/sale.entity'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Receipt, TrendingUp, DollarSign, ShoppingCart, Search, Filter, Calendar, ChevronRight, ArrowUpRight, Clock, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

const statusLabels: Record<string, string> = {
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  PENDING: 'Pendiente',
  REFUNDED: 'Reembolsada',
}

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  MOBILE: 'Móvil',
  CREDIT: 'Crédito',
}

export default async function SalesPage({
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
  const saleRepo = dataSource.getRepository(Sale)

  // Get all sales
  const sales = await saleRepo.find({
    where: { storeId: context.storeId },
    relations: ['cashier'],
    order: { createdAt: 'DESC' },
    take: 50,
  })

  // Calculate stats
  const completedSales = sales.filter((s) => s.status === SaleStatus.COMPLETED)
  const totalRevenue = completedSales.reduce((sum, sale) => sum + Number(sale.total), 0)
  const todaySales = completedSales.filter(
    (s) => new Date(s.createdAt).toDateString() === new Date().toDateString()
  )
  const todayRevenue = todaySales.reduce((sum, sale) => sum + Number(sale.total), 0)

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
            Historial de <span className="gradient-text">Ventas</span>
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Registro centralizado de transacciones y estados.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-11 rounded-xl font-bold border-border bg-card shadow-sm active:scale-95 transition-all hover:bg-secondary/50">
            <Calendar className="mr-2 h-4 w-4" />
            Filtro de Fecha
          </Button>
          <Button asChild className="h-11 rounded-xl px-6 font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all">
            <Link href={`/dashboard/${storeSlug}/pos`}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Nuevo Ticket
            </Link>
          </Button>
        </div>
      </div>

      {/* Analytics Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-border bg-card shadow-xl shadow-slate-950/5 overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <DollarSign className="h-12 w-12" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-3 w-3 text-emerald-500" />
              Ingresos Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight">${totalRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] font-bold px-2 py-0">
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
                Oficial
              </Badge>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                {completedSales.length} Ventas Confirmadas
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xl shadow-slate-950/5 overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="h-12 w-12" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Clock className="h-3 w-3 text-primary" />
              Cierre de Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight">${todayRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-bold px-2 py-0">
                Operativo
              </Badge>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                {todaySales.length} Transacciones Hoy
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xl shadow-slate-950/5 overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShoppingCart className="h-12 w-12" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="h-3 w-3 text-amber-500" />
              Ticket Medio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight">
              ${completedSales.length > 0 ? (totalRevenue / completedSales.length).toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '0.00'}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                Promedio por cliente
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales List Container */}
      <Card className="border border-border bg-card shadow-xl shadow-slate-950/5">
        <CardHeader className="px-6 py-6 border-b border-border/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                Recientes
              </CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Últimos 50 movimientos</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input placeholder="Buscar venta..." className="h-10 pl-9 rounded-xl border-border bg-secondary/50 focus-visible:ring-primary" />
              </div>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sales.length === 0 ? (
            <div className="text-center py-24 flex flex-col items-center">
              <div className="h-20 w-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
                <Receipt className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-bold mb-2">Canal Silencioso</h3>
              <p className="text-muted-foreground max-w-xs text-sm">
                No se registran ventas aún en este periodo. Comience a operar desde su terminal POS.
              </p>
              <Button asChild className="mt-8 rounded-xl font-bold px-8">
                <Link href={`/dashboard/${storeSlug}/pos`}>Ir al POS</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/40">
                    <th className="text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 py-4 px-6">ID / Tiempo</th>
                    <th className="text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 py-4 px-6">Cajero</th>
                    <th className="text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 py-4 px-6">Método</th>
                    <th className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 py-4 px-6">Estado</th>
                    <th className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 py-4 px-6">Monto Total</th>
                    <th className="py-4 px-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="group hover:bg-muted/20 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold tracking-tight text-foreground/90">
                            #{sale.id.substring(0, 8).toUpperCase()}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground opacity-60 flex items-center gap-1.5 pt-1 uppercase tracking-tighter">
                            {new Date(sale.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                            <span className="bg-muted px-1 rounded text-[8px] font-black">
                              {new Date(sale.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[10px] font-black">
                            {sale.cashier?.name?.charAt(0) || 'U'}
                          </div>
                          <span className="text-sm font-semibold text-muted-foreground">{sale.cashier?.name?.split(' ')[0] || 'Sistema'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-border/80 bg-secondary/30 text-muted-foreground">
                          {paymentMethodLabels[sale.paymentMethod] || sale.paymentMethod}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <Badge
                          variant={
                            sale.status === SaleStatus.COMPLETED
                              ? 'default'
                              : sale.status === SaleStatus.CANCELLED
                                ? 'destructive'
                                : 'secondary'
                          }
                          className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 border-none ${sale.status === SaleStatus.COMPLETED ? 'bg-emerald-500/20 text-emerald-600' :
                            sale.status === SaleStatus.CANCELLED ? 'bg-destructive/20 text-destructive' : ''
                            }`}
                        >
                          {statusLabels[sale.status] || sale.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="text-base font-black tracking-tight">
                          ${Number(sale.total).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                          <Link href={`/dashboard/${storeSlug}/sales/${sale.id}`}>
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
