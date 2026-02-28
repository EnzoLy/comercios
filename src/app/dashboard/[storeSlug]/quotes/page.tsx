'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, ExternalLink, Copy, Search, Filter, FileText, DollarSign, CheckCircle, Clock, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils/currency'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { QuoteItem, Quote } from '@/types'

const statusColors: Record<string, string> = {
  DRAFT: 'bg-secondary/50 text-muted-foreground border-none',
  SENT: 'bg-primary/10 text-primary border-none',
  ACCEPTED: 'bg-emerald-500/10 text-emerald-600 border-none',
  REJECTED: 'bg-destructive/10 text-destructive border-none',
  EXPIRED: 'bg-amber-500/10 text-amber-600 border-none',
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviado',
  ACCEPTED: 'Aceptado',
  REJECTED: 'Rechazado',
  EXPIRED: 'Vencido',
}

export default function QuotesPage() {
  const params = useParams()
  const router = useRouter()
  const storeSlug = params.storeSlug as string
  const [storeId, setStoreId] = useState<string>('')
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [stats, setStats] = useState({ total: 0, draft: 0, accepted: 0, totalValue: 0 })

  const getStoreId = useCallback(async () => {
    if (storeId) return storeId
    const res = await fetch(`/api/stores?slug=${storeSlug}`)
    const data = await res.json()
    const id = data[0]?.id
    setStoreId(id)
    return id
  }, [storeSlug, storeId])

  const fetchQuotes = useCallback(async () => {
    try {
      setLoading(true)
      const id = await getStoreId()
      const qs = new URLSearchParams()
      if (search) qs.append('search', search)
      if (status && status !== 'all') qs.append('status', status)

      const res = await fetch(`/api/stores/${id}/quotes?${qs.toString()}`)
      const data = await res.json()
      const allQuotes: Quote[] = data.quotes || []
      setQuotes(allQuotes)

      setStats({
        total: allQuotes.length,
        draft: allQuotes.filter((q) => q.status === 'DRAFT').length,
        accepted: allQuotes.filter((q) => q.status === 'ACCEPTED').length,
        totalValue: allQuotes.reduce((sum, q) => sum + Number(q.total), 0),
      })
    } catch (error) {
      console.error('Failed to fetch quotes:', error)
    } finally {
      setLoading(false)
    }
  }, [getStoreId, search, status])

  useEffect(() => {
    fetchQuotes()
  }, [fetchQuotes])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const id = await getStoreId()
      await fetch(`/api/stores/${id}/quotes/${deleteId}`, { method: 'DELETE' })
      setDeleteId(null)
      fetchQuotes()
    } catch {
      toast.error('Error al eliminar el presupuesto')
    }
  }

  const handleDuplicate = (quote: Quote) => {
    sessionStorage.setItem(
      'quote_prefill',
      JSON.stringify({
        clientName: quote.clientName,
        clientPhone: quote.clientPhone ?? '',
        notes: quote.notes ?? '',
        items: quote.items.map((item) => ({
          itemType: item.itemType,
          productId: item.productId ?? undefined,
          serviceId: item.serviceId ?? undefined,
          name: item.name,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount),
          taxRate: Number(item.taxRate),
        })),
      })
    )
    router.push(`/dashboard/${storeSlug}/quotes/new`)
  }

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
            <span className="gradient-text">Presupuestos</span>
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Cotizaciones y propuestas para tus clientes.
          </p>
        </div>
        <Link href={`/dashboard/${storeSlug}/quotes/new`}>
          <Button className="h-11 rounded-xl px-6 font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Presupuesto
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border border-border bg-card shadow-xl shadow-slate-950/5 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <FileText className="h-12 w-12" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <FileText className="h-3 w-3 text-primary" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight">{stats.total}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                Presupuestos
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xl shadow-slate-950/5 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Clock className="h-12 w-12" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Clock className="h-3 w-3 text-amber-500" />
              Borradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight">{stats.draft}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-none text-[10px] font-bold px-2 py-0">
                Pendientes
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xl shadow-slate-950/5 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <CheckCircle className="h-12 w-12" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-emerald-500" />
              Aceptados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight">{stats.accepted}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] font-bold px-2 py-0">
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
                Confirmados
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xl shadow-slate-950/5 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <DollarSign className="h-12 w-12" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-3 w-3 text-emerald-500" />
              Valor Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight">{formatCurrency(stats.totalValue)}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                Acumulado
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="border border-border bg-card shadow-xl shadow-slate-950/5">
        <CardHeader className="px-6 py-6 border-b border-border/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold">Lista de Presupuestos</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">
                Gestión de cotizaciones
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  placeholder="Buscar por número, cliente..."
                  className="h-10 pl-9 rounded-xl border-border bg-secondary/50 focus-visible:ring-primary"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-10 w-36 rounded-xl border-border bg-secondary/50">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="DRAFT">Borrador</SelectItem>
                  <SelectItem value="SENT">Enviado</SelectItem>
                  <SelectItem value="ACCEPTED">Aceptado</SelectItem>
                  <SelectItem value="REJECTED">Rechazado</SelectItem>
                  <SelectItem value="EXPIRED">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-16 text-muted-foreground text-sm font-bold">
              Cargando...
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-24 flex flex-col items-center">
              <div className="h-20 w-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
                <FileText className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-bold mb-2">Sin Presupuestos</h3>
              <p className="text-muted-foreground max-w-xs text-sm">
                Aún no creaste ningún presupuesto. Comenzá creando uno nuevo para tus clientes.
              </p>
              <Link href={`/dashboard/${storeSlug}/quotes/new`}>
                <Button className="mt-8 rounded-xl font-bold px-8">Crear Presupuesto</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/40">
                    <th className="text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 py-4 px-6">Número / Fecha</th>
                    <th className="text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 py-4 px-6">Cliente</th>
                    <th className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 py-4 px-6">Estado</th>
                    <th className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 py-4 px-6">Total</th>
                    <th className="py-4 px-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {quotes.map((quote) => (
                    <tr key={quote.id} className="group hover:bg-muted/20 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold tracking-tight text-foreground/90">
                            {quote.quoteNumber}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground opacity-60 uppercase tracking-tighter pt-1">
                            {new Date(quote.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[10px] font-black">
                            {quote.clientName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-muted-foreground">{quote.clientName}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <Badge className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 ${statusColors[quote.status]}`}>
                          {statusLabels[quote.status]}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="text-base font-black tracking-tight">
                          {formatCurrency(quote.total)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-1 justify-end">
                          <a href={`/quote/${quote.accessToken}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all" title="Ver presupuesto">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl hover:bg-secondary transition-all"
                            title="Duplicar presupuesto"
                            onClick={() => handleDuplicate(quote)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"
                            onClick={() => setDeleteId(quote.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
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
  )
}
