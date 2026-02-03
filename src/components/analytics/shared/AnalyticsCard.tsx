'use client'

import { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface AnalyticsCardProps {
  title: string
  description?: string
  children: ReactNode
  isLoading?: boolean
  error?: string | null
  action?: ReactNode
  footer?: ReactNode
}

export function AnalyticsCard({
  title,
  description,
  children,
  isLoading = false,
  error = null,
  action,
  footer,
}: AnalyticsCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {action && <div className="ml-4">{action}</div>}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : error ? (
          <div className="text-sm text-red-500">{error}</div>
        ) : (
          <>{children}</>
        )}
      </CardContent>
      {footer && (
        <div className="border-t px-6 py-3 text-sm text-muted-foreground">{footer}</div>
      )}
    </Card>
  )
}
