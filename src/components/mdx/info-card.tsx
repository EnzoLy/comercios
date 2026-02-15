'use client'

import * as LucideIcons from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface InfoCardProps {
  icon?: string
  title: string
  children: React.ReactNode
}

export function InfoCard({ icon = 'Info', title, children }: InfoCardProps) {
  // Obtener el componente de ícono dinámicamente
  const IconComponent = (LucideIcons as any)[icon] || LucideIcons.Info

  return (
    <Card className="my-6 border-primary/20 shadow-lg shadow-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconComponent className="h-5 w-5 text-primary" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {children}
        </div>
      </CardContent>
    </Card>
  )
}
