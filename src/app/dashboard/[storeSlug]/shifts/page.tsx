'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useStore } from '@/hooks/use-store'
import { formatCurrency } from '@/lib/utils/currency'
import { LoadingPage } from '@/components/ui/loading'
import { Clock, Plus, Trash2, Edit, Store } from 'lucide-react'

interface Employee {
  id: string
  user: {
    id: string
    name: string
    email: string
  }
}

interface Shift {
  id: string
  employeeId: string
  date: string
  startTime: string
  endTime?: string
  type: 'REGULAR' | 'SPECIAL'
  endDate?: string
  notes?: string
}

export default function ShiftsPage() {
  const router = useRouter()
  const store = useStore()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [formData, setFormData] = useState({
    employeeId: '',
    date: '',
    startTime: '',
    endTime: '',
    type: 'REGULAR' as 'REGULAR' | 'SPECIAL',
    endDate: '',
    notes: '',
  })

  useEffect(() => {
    if (store) {
      fetchData()
    }
  }, [store])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Fetch employees
      const empResponse = await fetch(`/api/stores/${store?.storeId}/employees`)
      if (empResponse.ok) {
        const empData = await empResponse.json()
        setEmployees(empData)
      }

      // Fetch shifts
      const shiftsResponse = await fetch(
        `/api/stores/${store?.storeId}/employee-shifts`
      )
      if (shiftsResponse.ok) {
        const shiftsData = await shiftsResponse.json()
        setShifts(shiftsData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDialog = (shift?: Shift) => {
    if (shift) {
      setEditingShift(shift)
      setFormData({
        employeeId: shift.employeeId,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime || '',
        type: shift.type,
        endDate: shift.endDate || '',
        notes: shift.notes || '',
      })
    } else {
      setEditingShift(null)
      setFormData({
        employeeId: '',
        date: '',
        startTime: '',
        endTime: '',
        type: 'REGULAR',
        endDate: '',
        notes: '',
      })
    }
    setIsDialogOpen(true)
  }

  const handleSaveShift = async () => {
    if (!formData.employeeId) {
      toast.error('Completa los campos requeridos')
      return
    }

    if (formData.type === 'REGULAR' && !formData.startTime) {
      toast.error('La hora de inicio es requerida para turnos regulares')
      return
    }

    if (formData.type === 'SPECIAL' && (!formData.date || !formData.endDate)) {
      toast.error('Las fechas de inicio y fin son requeridas para turnos especiales')
      return
    }

    try {
      if (editingShift) {
        const response = await fetch(
          `/api/stores/${store?.storeId}/employee-shifts/${editingShift.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              startTime: formData.startTime,
              endTime: formData.endTime || null,
              type: formData.type,
              endDate: formData.type === 'SPECIAL' ? formData.endDate : null,
              notes: formData.notes,
            }),
          }
        )

        if (!response.ok) {
          toast.error('Error al actualizar el turno')
          return
        }
        toast.success('Turno actualizado')
      } else {
        const dataToSend = {
          ...formData,
          date: formData.type === 'REGULAR' ? new Date().toISOString().split('T')[0] : formData.date,
          endDate: formData.type === 'SPECIAL' ? formData.endDate : null,
        }

        const response = await fetch(
          `/api/stores/${store?.storeId}/employee-shifts`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend),
          }
        )

        if (!response.ok) {
          const data = await response.json()
          toast.error(data.error || 'Error al crear el turno')
          return
        }
        toast.success('Turno creado')
      }

      setIsDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Error saving shift:', error)
      toast.error('Error al guardar el turno')
    }
  }

  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este turno?')) {
      return
    }

    try {
      const response = await fetch(
        `/api/stores/${store?.storeId}/employee-shifts/${shiftId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        toast.error('Error al eliminar el turno')
        return
      }

      toast.success('Turno eliminado')
      fetchData()
    } catch (error) {
      console.error('Error deleting shift:', error)
      toast.error('Error al eliminar el turno')
    }
  }

  if (!store) {
    return (
      <LoadingPage
        title="Cargando Turnos"
        description="Obteniendo información de la tienda..."
        icon={<Store className="h-8 w-8 text-gray-600" />}
      />
    )
  }

  if (isLoading) {
    return (
      <LoadingPage
        title="Cargando Turnos"
        description="Obteniendo los turnos programados..."
        icon={<Clock className="h-8 w-8 text-gray-600" />}
      />
    )
  }

  const getEmployeeName = (employeeId: string) => {
    const emp = employees.find((e) => e.user.id === employeeId)
    return emp ? emp.user.name : 'Unknown'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestión de Turnos</h1>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Turno
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {shifts.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="text-center text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No hay turnos programados</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          shifts.map((shift) => (
            <Card key={shift.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      {getEmployeeName(shift.employeeId)}
                    </h3>

                    {shift.type === 'SPECIAL' ? (
                      <>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-1 rounded">
                            Turno Especial
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          {formatDate(shift.date)}
                          {shift.endDate && ` - ${formatDate(shift.endDate)}`}
                        </p>
                        {shift.startTime && (
                          <p className="text-base font-medium mt-1">
                            {shift.startTime}
                            {shift.endTime && ` - ${shift.endTime}`}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-base font-medium mt-2">
                        {shift.startTime}
                        {shift.endTime && ` - ${shift.endTime}`}
                      </p>
                    )}

                    {shift.notes && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {shift.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(shift)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteShift(shift.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingShift ? 'Editar Turno' : 'Nuevo Turno'}
            </DialogTitle>
            <DialogDescription>
              Programa un turno para un empleado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Empleado</Label>
              <Select
                value={formData.employeeId}
                onValueChange={(value) =>
                  setFormData({ ...formData, employeeId: value })
                }
                disabled={!!editingShift}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un empleado" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.user.id} value={emp.user.id}>
                      {emp.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Turno</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => {
                  setFormData({
                    ...formData,
                    type: value,
                    endTime: '',
                    endDate: '',
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REGULAR">Turno Regular (Hora a Hora en el Mismo Día)</SelectItem>
                  <SelectItem value="SPECIAL">Turno Especial (Múltiples Días: Libre, Vacaciones, etc)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.type === 'REGULAR' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hora de Inicio *</Label>
                    <Input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) =>
                        setFormData({ ...formData, startTime: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Hora de Fin (Opcional)</Label>
                    <Input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) =>
                        setFormData({ ...formData, endTime: e.target.value })
                      }
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 italic">Este turno se repite todos los días</p>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha de Inicio *</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      disabled={!!editingShift}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha de Fin *</Label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                      min={formData.date}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hora de Inicio (Opcional)</Label>
                    <Input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) =>
                        setFormData({ ...formData, startTime: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Hora de Fin (Opcional)</Label>
                    <Input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) =>
                        setFormData({ ...formData, endTime: e.target.value })
                      }
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Notas (Opcional)</Label>
              <Input
                placeholder={
                  formData.type === 'SPECIAL'
                    ? 'Ej: Día libre, vacaciones, enfermedad'
                    : 'Ej: Turno corto, cierre de caja'
                }
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveShift}>
              {editingShift ? 'Actualizar' : 'Crear'} Turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
