import { Badge } from '@/components/ui/badge'
import { Check, Clock, XCircle, Infinity } from 'lucide-react'

interface SubscriptionStatusBadgeProps {
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'PERMANENT'
  daysRemaining?: number | null
  className?: string
}

export function SubscriptionStatusBadge({
  status,
  daysRemaining,
  className,
}: SubscriptionStatusBadgeProps) {
  const configs = {
    ACTIVE: {
      variant: 'default' as const,
      icon: Check,
      label: 'Active',
      className: 'bg-green-600 hover:bg-green-700 text-white',
    },
    EXPIRING_SOON: {
      variant: 'secondary' as const,
      icon: Clock,
      label: daysRemaining !== null && daysRemaining !== undefined
        ? `Expira en ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''}`
        : 'Por Vencer',
      className: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    },
    EXPIRED: {
      variant: 'destructive' as const,
      icon: XCircle,
      label: 'Expirada',
      className: 'bg-red-600 hover:bg-red-700 text-white',
    },
    PERMANENT: {
      variant: 'outline' as const,
      icon: Infinity,
      label: 'Permanente',
      className: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
    },
  }

  const config = configs[status]
  const Icon = config.icon

  return (
    <Badge className={`${config.className} ${className || ''}`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  )
}
