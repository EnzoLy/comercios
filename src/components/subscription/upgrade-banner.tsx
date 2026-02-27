'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ExternalLink, X, Zap } from 'lucide-react'

interface SubscriptionStatus {
  plan: 'FREE' | 'BASICO' | 'PRO'
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'PERMANENT'
  endDate: string | null
  daysRemaining: number | null
  checkoutUrl: string | null
}

interface UpgradeBannerProps {
  storeId: string
  storeSlug: string
  isOwner: boolean
}

export function UpgradeBanner({ storeId, storeSlug, isOwner }: UpgradeBannerProps) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch(`/api/stores/${storeId}/subscription-status`)
      .then((r) => r.json())
      .then((data: SubscriptionStatus) => {
        setStatus(data)
      })
      .catch(() => {/* fail silently */ })
  }, [storeId])

  if (!status || dismissed) return null

  const isFree = status.plan === 'FREE'
  const isExpiringSoon = status.status === 'EXPIRING_SOON'
  const isExpired = status.status === 'EXPIRED'

  // Only show the banner when there's something actionable for the user
  const shouldShow = isFree || isExpiringSoon || isExpired

  // Color scheme based on urgency
  const bannerClass = isExpired
    ? 'bg-red-600 text-white'
    : isExpiringSoon
      ? 'bg-amber-500 text-white'
      : 'bg-red-600 text-white'

  console.log(status.checkoutUrl)

  return (
    <div className={`relative flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${bannerClass}`}>
      <div className="flex items-center gap-2 min-w-0">
        {isFree ? (
          <Zap className="h-4 w-4 shrink-0" />
        ) : (
          <AlertTriangle className="h-4 w-4 shrink-0" />
        )}

        <span className="truncate">
          {isFree && 'Estás en el plan gratuito. Limitado a 50 productos y 1 usuario.'}
          {isExpiringSoon &&
            `Tu suscripción vence en ${status.daysRemaining} día${status.daysRemaining === 1 ? '' : 's'}.`}
          {isExpired && 'Tu suscripción expiró. El acceso está limitado.'}
        </span>
      </div>

      {isOwner && status.checkoutUrl && (
        <div className="flex items-center gap-2 shrink-0">
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="h-7 text-xs font-semibold"
          >
            <a href={status.checkoutUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              {isFree ? 'Mejorar plan' : 'Renovar ahora'}
            </a>
          </Button>

          {/* Only allow dismissal for non-expired banners */}
          {!isExpired && (
            <button
              onClick={() => setDismissed(true)}
              className="opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Cerrar aviso"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
