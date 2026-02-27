'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Trash2, Edit, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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
    status: 'PENDING' as const,
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

      // Fetch appointments
      const params = new URLSearchParams()
      if (dateFilter) params.append('dateFrom', dateFilter)
      if (statusFilter) params.append('status', statusFilter)

      const appRes = await fetch(
        `/api/stores/${storeId}/appointments?${params.toString()}`
      )
      const appData = await appRes.json()
      setAppointments(appData.appointments || [])

      // Fetch services
      const servRes = await fetch(`/api/stores/${storeId}/services`)
      const servData = await servRes.json()
      setServices(servData.services || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!formData.serviceId) {
        alert('Por favor selecciona un servicio')
        return
      }

      const storeRes = await fetch(`/api/stores?slug=${storeSlug}`)
      const stores = await storeRes.json()
      const storeId = stores[0].id

      const body = {
        ...formData,
        scheduledAt: new Date(formData.scheduledAt).toISOString(),
      }

      if (editingId) {
        await fetch(`/api/stores/${storeId}/appointments/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: formData.status, ...body }),
        })
      } else {
        await fetch(`/api/stores/${storeId}/appointments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      setOpen(false)
      setEditingId(null)
      resetForm()
      fetchData()
    } catch (error) {
      console.error('Failed to save appointment:', error)
      alert('Error al guardar la cita')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const storeRes = await fetch(`/api/stores?slug=${storeSlug}`)
      const stores = await storeRes.json()
      await fetch(`/api/stores/${stores[0].id}/appointments/${deleteId}`, {
        method: 'DELETE',
      })
      setDeleteId(null)
      fetchData()
    } catch (error) {
      console.error('Failed to delete appointment:', error)
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

  const openNewDialog = () => {
    setEditingId(null)
    resetForm()
    setOpen(true)
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    }
    return colors[status] || colors.PENDING
  }

  return (
    <div className="p-4 md:p-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Citas</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona las citas de tus servicios
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openNewDialog}>
              <Plus className="h-4 w-4" />
              Nueva Cita
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Cita' : 'Nueva Cita'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="service">Servicio</Label>
                <Select
                  value={formData.serviceId}
                  onValueChange={(val) =>
                    setFormData({ ...formData, serviceId: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
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
                  onChange={(e) =>
                    setFormData({ ...formData, clientName: e.target.value })
                  }
                  placeholder="Nombre"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientPhone">Teléfono</Label>
                <Input
                  id="clientPhone"
                  value={formData.clientPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, clientPhone: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      scheduledAt: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val: any) =>
                    setFormData({ ...formData, status: val })
                  }
                >
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
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Notas adicionales"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={!formData.serviceId}>{editingId ? 'Guardar' : 'Crear'}</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          placeholder="Filtrar por fecha"
        />
        <Select value={statusFilter || 'all'} onValueChange={(val) => setStatusFilter(val === 'all' ? '' : val)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Todos los estados" />
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

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-gray-50 dark:bg-gray-900">
              <TableHead>Cliente</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead>Fecha y Hora</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : appointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No hay citas
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((appt) => (
                <TableRow key={appt.id} className="border-b">
                  <TableCell className="font-medium">{appt.clientName}</TableCell>
                  <TableCell>{appt.service?.name}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(appt.scheduledAt).toLocaleString('es-MX')}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(
                        appt.status
                      )}`}
                    >
                      {appt.status === 'PENDING' && 'Pendiente'}
                      {appt.status === 'CONFIRMED' && 'Confirmada'}
                      {appt.status === 'COMPLETED' && 'Completada'}
                      {appt.status === 'CANCELLED' && 'Cancelada'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(appt)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteId(appt.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Eliminar Cita</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que quieres eliminar esta cita? Esta acción no se
            puede deshacer.
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
