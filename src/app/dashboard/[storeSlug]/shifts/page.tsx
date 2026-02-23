'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
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
import { LoadingPage } from '@/components/ui/loading'
import {
  Clock,
  Plus,
  Trash2,
  Edit,
  Store,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Employee {
  id: string
  user: { id: string; name: string; email: string }
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

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// Complete class strings so Tailwind JIT includes them
const CHIP_CLASSES = [
  'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
  'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700',
  'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
  'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700',
  'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700',
  'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700',
  'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700',
]

const DOT_CLASSES = [
  'bg-blue-400', 'bg-emerald-400', 'bg-purple-400', 'bg-amber-400',
  'bg-rose-400', 'bg-teal-400', 'bg-orange-400', 'bg-indigo-400',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMonday(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

// Parse date strings as local dates to avoid UTC timezone shifts
function toLocalDate(dateStr: string): Date {
  const part = dateStr.split('T')[0]
  const [y, m, d] = part.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function dateToInput(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const startStr = `${weekStart.getDate()} ${months[weekStart.getMonth()]}`
  const endStr = `${weekEnd.getDate()} ${months[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`
  return `${startStr} – ${endStr}`
}

function getShiftsForCell(employeeUserId: string, day: Date, shifts: Shift[]): Shift[] {
  return shifts.filter((shift) => {
    if (shift.employeeId !== employeeUserId) return false
    const shiftDate = toLocalDate(shift.date)
    if (shift.type === 'REGULAR') {
      return isSameDay(shiftDate, day)
    }
    const shiftEndDate = shift.endDate ? toLocalDate(shift.endDate) : shiftDate
    return day >= shiftDate && day <= shiftEndDate
  })
}

// ─── Shift Chip ──────────────────────────────────────────────────────────────

interface ShiftChipProps {
  shift: Shift
  chipClass: string
  onEdit: () => void
  onDelete: () => void
}

function ShiftChip({ shift, chipClass, onEdit, onDelete }: ShiftChipProps) {
  const [open, setOpen] = useState(false)
  const label =
    shift.type === 'SPECIAL'
      ? shift.notes || 'Día especial'
      : `${shift.startTime}${shift.endTime ? `–${shift.endTime}` : ''}`

  return (
    <div className="relative">
      <div
        className={`rounded border px-2 py-1 mb-1 cursor-pointer text-xs font-medium leading-tight select-none transition-opacity hover:opacity-75 ${chipClass}`}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 top-full left-0 mt-1 bg-popover border rounded-md shadow-lg p-1 flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                onEdit()
              }}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                onDelete()
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ShiftsPage() {
  const store = useStore()
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMonday(new Date()))
  const [shifts, setShifts] = useState<Shift[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [repeatWeeks, setRepeatWeeks] = useState('0')
  const [formData, setFormData] = useState({
    employeeId: '',
    date: dateToInput(new Date()),
    startTime: '',
    endTime: '',
    type: 'REGULAR' as 'REGULAR' | 'SPECIAL',
    endDate: '',
    notes: '',
  })

  const weekDays = getWeekDays(currentWeekStart)

  const fetchData = async () => {
    if (!store) return
    setIsLoading(true)
    try {
      const weekEnd = weekDays[6]
      const [empRes, shiftsRes] = await Promise.all([
        fetch(`/api/stores/${store.storeId}/employees`),
        fetch(
          `/api/stores/${store.storeId}/employee-shifts?startDate=${dateToInput(currentWeekStart)}&endDate=${dateToInput(weekEnd)}`
        ),
      ])
      if (empRes.ok) setEmployees(await empRes.json())
      if (shiftsRes.ok) setShifts(await shiftsRes.json())
    } catch {
      toast.error('Error al cargar los datos')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (store) fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, currentWeekStart])

  const navigateWeek = (delta: number) => {
    setCurrentWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + delta * 7)
      return d
    })
  }

  const handleOpenDialog = (shift?: Shift, preEmployeeId?: string, preDate?: string) => {
    if (shift) {
      setEditingShift(shift)
      setFormData({
        employeeId: shift.employeeId,
        date: shift.date.split('T')[0],
        startTime: shift.startTime,
        endTime: shift.endTime || '',
        type: shift.type,
        endDate: shift.endDate ? shift.endDate.split('T')[0] : '',
        notes: shift.notes || '',
      })
    } else {
      setEditingShift(null)
      setRepeatWeeks('0')
      setFormData({
        employeeId: preEmployeeId || '',
        date: preDate || dateToInput(new Date()),
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
    if (!formData.employeeId || !formData.date) {
      toast.error('Completa los campos requeridos')
      return
    }
    if (formData.type === 'REGULAR' && !formData.startTime) {
      toast.error('La hora de inicio es requerida')
      return
    }
    if (formData.type === 'SPECIAL' && !formData.endDate) {
      toast.error('La fecha de fin es requerida')
      return
    }

    try {
      if (editingShift) {
        const res = await fetch(
          `/api/stores/${store?.storeId}/employee-shifts/${editingShift.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              startTime: formData.startTime || '00:00',
              endTime: formData.endTime || null,
              type: formData.type,
              endDate: formData.type === 'SPECIAL' ? formData.endDate : null,
              notes: formData.notes,
            }),
          }
        )
        if (!res.ok) { toast.error('Error al actualizar'); return }
        toast.success('Turno actualizado')
      } else {
        const res = await fetch(`/api/stores/${store?.storeId}/employee-shifts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: formData.employeeId,
            date: formData.date,
            startTime: formData.startTime || '00:00',
            endTime: formData.endTime || null,
            type: formData.type,
            endDate: formData.type === 'SPECIAL' ? formData.endDate : null,
            notes: formData.notes,
            repeatWeeks: formData.type === 'REGULAR' ? Number(repeatWeeks) : 0,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error || 'Error al crear el turno')
          return
        }
        const rw = Number(repeatWeeks)
        toast.success(rw > 0 ? `${rw + 1} turnos creados` : 'Turno creado')
      }
      setIsDialogOpen(false)

      // Navigate to the week containing the saved shift's date so it's visible immediately
      const shiftWeekMonday = getMonday(toLocalDate(formData.date))
      const isSameWeek = dateToInput(shiftWeekMonday) === dateToInput(currentWeekStart)
      if (isSameWeek) {
        // Already on the right week — refresh manually (useEffect won't re-fire)
        fetchData()
      } else {
        // Different week — update state; useEffect will trigger fetchData
        setCurrentWeekStart(shiftWeekMonday)
      }
    } catch {
      toast.error('Error al guardar el turno')
    }
  }

  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm('¿Eliminar este turno?')) return
    try {
      const res = await fetch(
        `/api/stores/${store?.storeId}/employee-shifts/${shiftId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) { toast.error('Error al eliminar'); return }
      toast.success('Turno eliminado')
      setShifts((prev) => prev.filter((s) => s.id !== shiftId))
    } catch {
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

  return (
    <div className="space-y-6 p-6">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Gestión de Turnos</h1>
        <div className="flex items-center gap-2">
          {/* Week navigator */}
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 px-1 py-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => navigateWeek(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[200px] text-center text-sm font-medium px-2">
              {formatWeekRange(currentWeekStart)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => navigateWeek(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeekStart(getMonday(new Date()))}
          >
            Hoy
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Turno
          </Button>
        </div>
      </div>

      {/* ─── Calendar Grid ───────────────────────────────────────────── */}
      <Card className="overflow-auto">
        <CardContent className="p-0">
          {/* Day header row */}
          <div
            className="grid border-b"
            style={{ gridTemplateColumns: '160px repeat(7, minmax(100px, 1fr))' }}
          >
            <div className="p-3 border-r text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Empleado
            </div>
            {weekDays.map((day, i) => (
              <div
                key={i}
                className={`p-3 border-r last:border-r-0 text-center ${
                  isToday(day) ? 'bg-primary/5' : ''
                }`}
              >
                <div className="text-xs text-muted-foreground font-medium">
                  {DAY_NAMES[i]}
                </div>
                <div
                  className={`mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                    isToday(day)
                      ? 'bg-primary text-primary-foreground'
                      : ''
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Employee rows */}
          {employees.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay empleados registrados</p>
            </div>
          ) : (
            employees.map((emp, empIndex) => {
              const chipClass = CHIP_CLASSES[empIndex % CHIP_CLASSES.length]
              const dotClass = DOT_CLASSES[empIndex % DOT_CLASSES.length]
              return (
                <div
                  key={emp.user.id}
                  className="grid border-b last:border-b-0"
                  style={{ gridTemplateColumns: '160px repeat(7, minmax(100px, 1fr))' }}
                >
                  {/* Employee name */}
                  <div className="p-3 border-r flex items-center gap-2 bg-muted/20">
                    <span className={`h-2 w-2 flex-shrink-0 rounded-full ${dotClass}`} />
                    <span className="truncate text-sm font-medium" title={emp.user.name}>
                      {emp.user.name}
                    </span>
                  </div>

                  {/* Day cells */}
                  {weekDays.map((day, di) => {
                    const cellShifts = getShiftsForCell(emp.user.id, day, shifts)
                    return (
                      <div
                        key={di}
                        className={`group min-h-[72px] border-r last:border-r-0 p-1.5 ${
                          isToday(day) ? 'bg-primary/5' : ''
                        }`}
                      >
                        {cellShifts.map((shift) => (
                          <ShiftChip
                            key={shift.id}
                            shift={shift}
                            chipClass={chipClass}
                            onEdit={() => handleOpenDialog(shift)}
                            onDelete={() => handleDeleteShift(shift.id)}
                          />
                        ))}
                        <button
                          onClick={() =>
                            handleOpenDialog(undefined, emp.user.id, dateToInput(day))
                          }
                          className="mt-0.5 flex h-6 w-full items-center justify-center rounded text-xs text-muted-foreground/40 opacity-0 transition-opacity hover:bg-muted hover:text-muted-foreground group-hover:opacity-100"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* ─── Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingShift ? 'Editar Turno' : 'Nuevo Turno'}</DialogTitle>
            <DialogDescription>Programa un turno para un empleado</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Employee */}
            <div className="space-y-2">
              <Label>Empleado</Label>
              <Select
                value={formData.employeeId}
                onValueChange={(v) => setFormData({ ...formData, employeeId: v })}
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

            {/* Type */}
            <div className="space-y-2">
              <Label>Tipo de Turno</Label>
              <Select
                value={formData.type}
                onValueChange={(v: 'REGULAR' | 'SPECIAL') =>
                  setFormData({ ...formData, type: v, endTime: '', endDate: '' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REGULAR">Regular (hora a hora)</SelectItem>
                  <SelectItem value="SPECIAL">Especial (vacaciones, día libre...)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.type === 'REGULAR' ? (
              <>
                <div className="space-y-2">
                  <Label>Fecha *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hora de inicio *</Label>
                    <Input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora de fin</Label>
                    <Input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    />
                  </div>
                </div>
                {!editingShift && (
                  <div className="space-y-2">
                    <Label>Repetir semanalmente</Label>
                    <Select value={repeatWeeks} onValueChange={setRepeatWeeks}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No repetir</SelectItem>
                        <SelectItem value="1">2 semanas</SelectItem>
                        <SelectItem value="3">4 semanas</SelectItem>
                        <SelectItem value="7">8 semanas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha de inicio *</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      disabled={!!editingShift}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de fin *</Label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      min={formData.date}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hora de inicio</Label>
                    <Input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora de fin</Label>
                    <Input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Input
                placeholder={
                  formData.type === 'SPECIAL'
                    ? 'Ej: Día libre, vacaciones, enfermedad'
                    : 'Ej: Cierre de caja, turno corto'
                }
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
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
