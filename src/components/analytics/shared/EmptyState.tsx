'use client'

import { AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: boolean
}

export function EmptyState({
  title = 'Sin datos disponibles',
  description = 'No hay datos para mostrar en el rango de fechas seleccionado.',
  icon = true,
}: EmptyStateProps) {
  return (
    <Card className="p-12">
      <div className="text-center space-y-4">
        {icon && <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />}
        <div>
          <p className="font-medium text-lg">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </Card>
  )
}
