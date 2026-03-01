'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, Edit, Search, Wrench, Activity, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Skeleton, TableSkeleton, StatsSkeleton } from '@/components/ui/skeleton'
import { Service } from '@/types'

export default function ServicesPage() {
  const params = useParams()
  const storeSlug = params.storeSlug as string
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [stats, setStats] = useState({ total: 0, active: 0 })

  useEffect(() => {
    fetchServices()
  }, [search, storeSlug])

  const fetchServices = async () => {
    try {
      setLoading(true)
      const storeId = await getStoreId()
      const res = await fetch(
        `/api/stores/${storeId}/services?search=${search}&includeInactive=true`
      )
      const data = await res.json()
      const all: Service[] = data.services || []
      setServices(all)
      setStats({
        total: all.length,
        active: all.filter((s) => s.isActive).length,
      })
    } catch (error) {
      console.error('Failed to fetch services:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStoreId = async () => {
    const res = await fetch(`/api/stores?slug=${storeSlug}`)
    const data = await res.json()
    return data[0]?.id
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const storeId = await getStoreId()
      await fetch(`/api/stores/${storeId}/services/${deleteId}`, { method: 'DELETE' })
      setDeleteId(null)
      fetchServices()
    } catch {
      toast.error('Error al eliminar el servicio')
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
            <span className="gradient-text">Servicios</span>
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" />
            Servicios y prestaciones que ofrecés a tus clientes.
          </p>
        </div>
        <Link href={`/dashboard/${storeSlug}/services/new`}>
          <Button className="h-11 rounded-xl px-6 font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Servicio
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-border bg-card shadow-xl shadow-slate-950/5 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wrench className="h-12 w-12" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Wrench className="h-3 w-3 text-primary" />
              Total Servicios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight">{stats.total}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                Registrados
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xl shadow-slate-950/5 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity className="h-12 w-12" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Activity className="h-3 w-3 text-emerald-500" />
              Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight">{stats.active}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] font-bold px-2 py-0">
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
                Disponibles
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="border border-border bg-card shadow-xl shadow-slate-950/5">
        <CardHeader className="px-6 py-6 border-b border-border/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold">Catálogo de Servicios</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">
                Gestión de servicios
              </CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                placeholder="Buscar servicios..."
                className="h-10 pl-9 rounded-xl border-border bg-secondary/50 focus-visible:ring-primary"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 md:p-8 space-y-6">
              <TableSkeleton />
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-24 flex flex-col items-center">
              <div className="h-20 w-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
                <Wrench className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-bold mb-2">Sin Servicios</h3>
              <p className="text-muted-foreground max-w-xs text-sm">
                Aún no creaste ningún servicio. Agregá servicios para incluirlos en presupuestos y ventas.
              </p>
              <Link href={`/dashboard/${storeSlug}/services/new`}>
                <Button className="mt-8 rounded-xl font-bold px-8">Crear Servicio</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/40">
                    <th className="text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 py-4 px-6">Nombre</th>
                    <th className="text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 py-4 px-6">Categoría</th>
                    <th className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 py-4 px-6">Precio</th>
                    <th className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 py-4 px-6">Estado</th>
                    <th className="py-4 px-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {services.map((service) => (
                    <tr key={service.id} className="group hover:bg-muted/20 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <Wrench className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground/90">{service.name}</p>
                            {service.description && (
                              <p className="text-[10px] text-muted-foreground opacity-60 font-bold uppercase tracking-tighter truncate max-w-[200px]">
                                {service.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-muted-foreground font-semibold">
                          {service.category?.name || '—'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="text-base font-black tracking-tight">
                          {formatCurrency(service.price)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <Badge
                          className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 border-none ${
                            service.isActive
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-secondary/50 text-muted-foreground'
                          }`}
                        >
                          {service.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-1 justify-end">
                          <Link href={`/dashboard/${storeSlug}/services/${service.id}`}>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"
                            onClick={() => setDeleteId(service.id)}
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
          <AlertDialogTitle>Eliminar Servicio</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro? Si el servicio tiene ventas asociadas, se desactivará en lugar de eliminarse.
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
