'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Trash2, Edit, Calendar, Clock, CheckCircle, XCircle, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface Service {
  id: string
  name: string
}

interface Appointment {
  id: string
  clientName: string
  clientPhone: string
  clientEmail: string
  serviceId: string
  scheduledAt: string
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  notes: string
  service: Service
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-600 border-none',
  CONFIRMED: 'bg-primary/10 text-primary border-none',
  COMPLETED: 'bg-emerald-500/10 text-emerald-600 border-none',
  CANCELLED: 'bg-destructive/10 text-destructive border-none',
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
}

export default function AppointmentsPage() {
  const params = useParams()
  const storeSlug = params.storeSlug as string

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [formData, setFormData] = useState({
    serviceId: '',
    clientName: '',
    clientPhone: '',
    scheduledAt: new Date().toISOString().slice(0, 16),
    status: 'PENDING' as 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED',
    notes: '',
  })

  useEffect(() => {
    fetchData()
  }, [storeSlug, dateFilter, statusFilter])

  const fetchData = async () => {
    try {
      setLoading(true)
      const storeRes = await fetch(`/api/stores?slug=${storeSlug}`)
      const stores = await storeRes.json()
      const storeId = stores[0].id

      const qs = new URLSearchParams()
      if (dateFilter) qs.append('dateFrom', dateFilter)
      if (statusFilter) qs.append('status', statusFilter)

      const [appRes, servRes] = await Promise.all([
        fetch(`/api/stores/${storeId}/appointments?${qs.toString()}`),
        fetch(`/api/stores/${storeId}/services`),
      ])
      const appData = await appRes.json()
      const servData = await servRes.json()
      setAppointments(appData.appointments || [])
      setServices(servData.services || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.serviceId) {
      toast.error('Por favor seleccioná un servicio')
      return
    }
    try {
      const storeRes = await fetch(`/api/stores?slug=${storeSlug}`)
      const stores = await storeRes.json()
      const storeId = stores[0].id
      const body = { ...formData, scheduledAt: new Date(formData.scheduledAt).toISOString() }

      if (editingId) {
        await fetch(`/api/stores/${storeId}/appointments/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        toast.success('Cita actualizada')
      } else {
        await fetch(`/api/stores/${storeId}/appointments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        toast.success('Cita creada')
      }

      setOpen(false)
      setEditingId(null)
      resetForm()
      fetchData()
    } catch {
      toast.error('Error al guardar la cita')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const storeRes = await fetch(`/api/stores?slug=${storeSlug}`)
      const stores = await storeRes.json()
      await fetch(`/api/stores/${stores[0].id}/appointments/${deleteId}`, { method: 'DELETE' })
      setDeleteId(null)
      fetchData()
    } catch {
      toast.error('Error al eliminar la cita')
    }
  }

  const resetForm = () => {
    setFormData({
      serviceId: '',
      clientName: '',
      clientPhone: '',
      scheduledAt: new Date().toISOString().slice(0, 16),
      status: 'PENDING',
      notes: '',
    })
  }

  const openEditDialog = (appt: Appointment) => {
    setEditingId(appt.id)
    setFormData({
      serviceId: appt.serviceId,
      clientName: appt.clientName,
      clientPhone: appt.clientPhone || '',
      scheduledAt: new Date(appt.scheduledAt).toISOString().slice(0, 16),
      status: appt.status,
      notes: appt.notes || '',
    })
    setOpen(true)
  }

  const pending = appointments.filter((a) => a.status === 'PENDING').length
  const confirmed = appointments.filter((a) => a.status === 'CONFIRMED').length
  const completed = appointments.filter((a) => a.status === 'COMPLETED').length

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
            <span className="gradient-text">Citas</span>
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Agenda y seguimiento de citas de tus servicios.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              className="h-11 rounded-xl px-6 font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
              onClick={() => { setEditingId(null); resetForm() }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva Cita
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Cita' : 'Nueva Cita'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Servicio</Label>
                <Select value={formData.serviceId} onValueChange={(val) => setFormData({ ...formData, serviceId: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientName">Nombre del Cliente</Label>
                <Input
                  id="clientName"
                  required
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientPhone">Teléfono</Label>
                <Input
                  id="clientPhone"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                  placeholder="Teléfono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">Fecha y Hora</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  required
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={formData.status} onValueChange={(val: any) => setFormData({ ...formData, status: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pendiente</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmada</SelectItem>
                    <SelectItem value="COMPLETED">Completada</SelectItem>
                    <SelectItem value="CANCELLED">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas adicionales"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="rounded-xl font-bold" disabled={!formData.serviceId}>
                  {editingId ? 'Guardar' : 'Crear'}
                </Button>
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-border bg-card shadow-xl shadow-slate-950/5 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Clock className="h-12 w-12" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Clock className="h-3 w-3 text-amber-500" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight">{pending}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-none text-[10px] font-bold px-2 py-0">
                Por atender
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xl shadow-slate-950/5 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Calendar className="h-12 w-12" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Calendar className="h-3 w-3 text-primary" />
              Confirmadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight">{confirmed}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-bold px-2 py-0">
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
                Agendadas
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
              Completadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight">{completed}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] font-bold px-2 py-0">
                Finalizadas
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
              <CardTitle className="text-xl font-bold">Lista de Citas</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">
                Agenda de turnos
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-10 w-40 rounded-xl border-border bg-secondary/50 focus-visible:ring-primary"
              />
              <Select value={statusFilter || 'all'} onValueChange={(val) => setStatusFilter(val === 'all' ? '' : val)}>
                <SelectTrigger className="h-10 w-36 rounded-xl border-border bg-secondary/50">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="PENDING">Pendientes</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmadas</SelectItem>
                  <SelectItem value="COMPLETED">Completadas</SelectItem>
                  <SelectItem value="CANCELLED">Canceladas</SelectItem>
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
          ) : appointments.length === 0 ? (
            <div className="text-center py-24 flex flex-col items-center">
              <div className="h-20 w-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
                <Calendar className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-bold mb-2">Sin Citas</h3>
              <p className="text-muted-foreground max-w-xs text-sm">
                No hay citas registradas. Creá una nueva cita para comenzar.
              </p>
              <Button
                className="mt-8 rounded-xl font-bold px-8"
                onClick={() => { setEditingId(null); resetForm(); setOpen(true) }}
              >
                Crear Cita
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/40">
                    <th className="text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 py-4 px-6">Cliente</th>
                    <th className="text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 py-4 px-6">Servicio</th>
                    <th className="text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 py-4 px-6">Fecha y Hora</th>
                    <th className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 py-4 px-6">Estado</th>
                    <th className="py-4 px-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {appointments.map((appt) => (
                    <tr key={appt.id} className="group hover:bg-muted/20 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[10px] font-black">
                            {appt.clientName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground/90">{appt.clientName}</p>
                            {appt.clientPhone && (
                              <p className="text-[10px] text-muted-foreground opacity-60 font-bold uppercase tracking-tighter">
                                {appt.clientPhone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-semibold text-muted-foreground">
                          {appt.service?.name}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground/90">
                            {new Date(appt.scheduledAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground opacity-60 uppercase tracking-tighter flex items-center gap-1 pt-0.5">
                            <span className="bg-muted px-1 rounded text-[8px] font-black">
                              {new Date(appt.scheduledAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <Badge className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 ${statusColors[appt.status]}`}>
                          {statusLabels[appt.status]}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                            onClick={() => openEditDialog(appt)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"
                            onClick={() => setDeleteId(appt.id)}
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
          <AlertDialogTitle>Eliminar Cita</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que querés eliminar esta cita? Esta acción no se puede deshacer.
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
