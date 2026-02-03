'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

interface DateRangeSelectorProps {
  startDate: string
  endDate: string
  onDateChange: (startDate: string, endDate: string) => void
}

export function DateRangeSelector({ startDate, endDate, onDateChange }: DateRangeSelectorProps) {
  const [localStartDate, setLocalStartDate] = useState(startDate)
  const [localEndDate, setLocalEndDate] = useState(endDate)

  const applyDateRange = () => {
    if (localEndDate >= localStartDate) {
      onDateChange(localStartDate, localEndDate)
    }
  }

  const setPreset = (days: number | null) => {
    const end = new Date()
    const start = new Date()

    if (days === null) {
      // This month
      start.setDate(1)
    } else if (days === -1) {
      // Last month
      start.setMonth(start.getMonth() - 1)
      start.setDate(1)
      end.setDate(0)
    } else if (days === 365) {
      // This year
      start.setMonth(0)
      start.setDate(1)
    } else {
      start.setDate(start.getDate() - days)
    }

    const newStartDate = start.toISOString().split('T')[0]
    const newEndDate = end.toISOString().split('T')[0]

    setLocalStartDate(newStartDate)
    setLocalEndDate(newEndDate)
    onDateChange(newStartDate, newEndDate)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Preset Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreset(0)}
              className="text-xs"
            >
              Hoy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreset(7)}
              className="text-xs"
            >
              Últimos 7 días
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreset(30)}
              className="text-xs"
            >
              Últimos 30 días
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreset(null)}
              className="text-xs"
            >
              Este mes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreset(-1)}
              className="text-xs"
            >
              Mes pasado
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreset(365)}
              className="text-xs"
            >
              Este año
            </Button>
          </div>

          {/* Date Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Fecha de inicio</label>
              <Input
                type="date"
                value={localStartDate}
                onChange={(e) => setLocalStartDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Fecha de fin</label>
              <Input
                type="date"
                value={localEndDate}
                onChange={(e) => setLocalEndDate(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Apply Button */}
          <div className="flex justify-end">
            <Button
              onClick={applyDateRange}
              className="bg-primary hover:bg-primary/90"
            >
              Aplicar
            </Button>
          </div>

          {/* Validation Message */}
          {localEndDate < localStartDate && (
            <p className="text-sm text-red-500">La fecha de fin debe ser posterior a la fecha de inicio</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
