'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface ShiftCountdownProps {
  shift?: {
    startTime: string
    endTime?: string
  }
}

export function ShiftCountdown({ shift }: ShiftCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [isEnding, setIsEnding] = useState(false)

  useEffect(() => {
    if (!shift?.endTime) return

    const calculateTimeRemaining = () => {
      const now = new Date()
      const [endHour, endMinute] = shift.endTime!.split(':').map(Number)

      // Create end time for today
      const endTime = new Date()
      endTime.setHours(endHour, endMinute, 0, 0)

      // If end time is in the past, it means it's for tomorrow
      if (endTime < now) {
        endTime.setDate(endTime.getDate() + 1)
      }

      const diff = endTime.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeRemaining('Turno finalizado')
        setIsEnding(true)
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)

      // Show warning when less than 30 minutes
      setIsEnding(diff < 30 * 60 * 1000)
    }

    calculateTimeRemaining()
    const interval = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [shift?.endTime])

  if (!shift) {
    return (
      <Card className="mb-4 border-gray-300 dark:border-gray-700">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium">Turno:</span>
            </div>
            <span className="font-bold text-sm text-gray-500">Sin turno asignado</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`mb-4 ${isEnding && timeRemaining !== 'Turno finalizado' ? 'border-red-300 dark:border-red-700' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className={`h-4 w-4 ${isEnding && timeRemaining !== 'Turno finalizado' ? 'text-red-500 animate-pulse' : 'text-blue-500'}`} />
            <span className="text-sm font-medium">Tiempo restante:</span>
          </div>
          <span
            className={`font-bold text-sm ${
              !shift?.endTime
                ? 'text-gray-500'
                : isEnding && timeRemaining !== 'Turno finalizado'
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400'
            }`}
          >
            {shift?.endTime ? timeRemaining : 'Sin hora de fin'}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
