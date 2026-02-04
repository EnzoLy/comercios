'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Clock, Truck, Calendar } from 'lucide-react'

interface DeliverySchedule {
  id: string
  dayOfWeek: number
  deliveryTime?: string
  deliveryTimeEnd?: string
  isActive: boolean
  notes?: string
}

interface SupplierDeliveryScheduleProps {
  supplierId: string
  initialSchedules: any[]
  storeId: string
}

const DAYS_OF_WEEK = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
]

export function SupplierDeliverySchedule({
  supplierId,
  initialSchedules,
  storeId,
}: SupplierDeliveryScheduleProps) {
  const [schedules] = useState<DeliverySchedule[]>(initialSchedules)

  const formatTime = (time?: string) => {
    if (!time) return null

    try {
      // Handle both "HH:MM:SS" and "HH:MM" formats
      const [hours, minutes] = time.split(':')
      const date = new Date()
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10))

      return new Intl.DateTimeFormat('es-MX', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(date)
    } catch (error) {
      return time
    }
  }

  const getSchedulesByDay = () => {
    const scheduleMap = new Map<number, DeliverySchedule[]>()

    schedules.forEach((schedule) => {
      const existing = scheduleMap.get(schedule.dayOfWeek) || []
      existing.push(schedule)
      scheduleMap.set(schedule.dayOfWeek, existing)
    })

    return scheduleMap
  }

  const schedulesByDay = getSchedulesByDay()
  const hasSchedules = schedules.length > 0

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Horario de Entregas</h3>
          <p className="text-sm text-muted-foreground">
            Días y horarios en los que el proveedor realiza entregas
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Horario
        </Button>
      </div>

      {!hasSchedules ? (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="text-lg font-semibold mb-2">No hay horarios configurados</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Define los días y horarios de entrega del proveedor
            </p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Horario
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader>
            <CardTitle>Días de Entrega</CardTitle>
            <CardDescription>
              Horarios configurados para recepción de mercancía
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {DAYS_OF_WEEK.map((dayName, dayIndex) => {
                const daySchedules = schedulesByDay.get(dayIndex) || []
                const hasDelivery = daySchedules.length > 0
                const activeSchedules = daySchedules.filter((s) => s.isActive)

                return (
                  <div
                    key={dayIndex}
                    className={`flex items-start gap-4 p-4 rounded-lg border ${
                      hasDelivery && activeSchedules.length > 0
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-muted/50 border-border'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
                      {hasDelivery && activeSchedules.length > 0 ? (
                        <Truck className="h-5 w-5 text-primary" />
                      ) : (
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{dayName}</h4>
                        {hasDelivery && activeSchedules.length > 0 && (
                          <Badge variant="default">Entrega disponible</Badge>
                        )}
                      </div>

                      {activeSchedules.length > 0 ? (
                        <div className="space-y-2">
                          {activeSchedules.map((schedule) => (
                            <div key={schedule.id} className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {schedule.deliveryTime && schedule.deliveryTimeEnd
                                  ? `${formatTime(schedule.deliveryTime)} - ${formatTime(
                                      schedule.deliveryTimeEnd
                                    )}`
                                  : schedule.deliveryTime
                                  ? `Desde ${formatTime(schedule.deliveryTime)}`
                                  : 'Todo el día'}
                              </span>
                            </div>
                          ))}
                          {activeSchedules.some((s) => s.notes) && (
                            <div className="text-xs text-muted-foreground mt-2">
                              {activeSchedules
                                .filter((s) => s.notes)
                                .map((s) => s.notes)
                                .join('; ')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No hay entregas este día</p>
                      )}
                    </div>

                    {hasDelivery && (
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Card */}
      {hasSchedules && (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Días de Entrega</p>
                  <p className="text-xl font-semibold">
                    {new Set(schedules.filter((s) => s.isActive).map((s) => s.dayOfWeek)).size}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Horarios Activos</p>
                  <p className="text-xl font-semibold">
                    {schedules.filter((s) => s.isActive).length}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Horarios</p>
                  <p className="text-xl font-semibold">{schedules.length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
