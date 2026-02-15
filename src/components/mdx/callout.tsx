'use client'

import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface CalloutProps {
  type?: 'info' | 'warning' | 'success' | 'danger'
  title?: string
  children: React.ReactNode
}

const calloutConfig = {
  info: {
    icon: Info,
    className: 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100'
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-900 dark:text-yellow-100'
  },
  success: {
    icon: CheckCircle2,
    className: 'border-green-500/50 bg-green-50 dark:bg-green-950/30 text-green-900 dark:text-green-100'
  },
  danger: {
    icon: AlertCircle,
    className: 'border-red-500/50 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-100'
  }
}

export function Callout({ type = 'info', title, children }: CalloutProps) {
  const config = calloutConfig[type]
  const Icon = config.icon

  return (
    <Alert className={cn('my-4', config.className)}>
      <Icon className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}
