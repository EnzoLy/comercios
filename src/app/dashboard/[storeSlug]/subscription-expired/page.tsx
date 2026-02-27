'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, ArrowLeft, ExternalLink, RefreshCw, Loader2 } from 'lucide-react'

function SubscriptionExpiredContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const storeSlug = params.storeSlug as string
  const storeId = searchParams.get('storeId')

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)

  useEffect(() => {
    if (!storeId) return
    setIsLoadingUrl(true)
    fetch(`/api/stores/${storeId}/subscription-status`)
      .then((r) => r.json())
      .then((data) => setCheckoutUrl(data.checkoutUrl ?? null))
      .catch(() => {})
      .finally(() => setIsLoadingUrl(false))
  }, [storeId])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 p-4">
      <Card className="max-w-2xl w-full border-red-200 shadow-xl">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="flex justify-center">
            <div className="rounded-full bg-red-100 p-6">
              <AlertTriangle className="h-16 w-16 text-red-600" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-red-900">
              Suscripción Expirada
            </CardTitle>
            <CardDescription className="text-lg mt-3">
              La suscripción de esta tienda ha expirado y el acceso está temporalmente bloqueado
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-3 text-orange-900">
              ¿Qué significa esto?
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">•</span>
                <span>El período de suscripción de esta tienda ha finalizado</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">•</span>
                <span>
                  No se pueden realizar operaciones como ventas, inventario o gestión de productos
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">•</span>
                <span>Los datos de la tienda están seguros y no se perderán</span>
              </li>
            </ul>
          </div>

          {/* Self-service renewal */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-3 text-blue-900 flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Renovar tu suscripción
            </h3>
            <p className="text-gray-700 mb-4">
              Podés renovar tu suscripción directamente desde acá. El acceso se restaurará
              automáticamente después del pago.
            </p>

            {isLoadingUrl ? (
              <Button disabled className="w-full">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando...
              </Button>
            ) : checkoutUrl ? (
              <Button asChild className="w-full">
                <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Renovar con LemonSqueezy
                </a>
              </Button>
            ) : (
              <div className="bg-white rounded-md p-4 border border-blue-200 text-sm text-gray-700">
                Contactá a soporte por WhatsApp para renovar tu plan:{' '}
                <a
                  href="https://wa.me/542954393274"
                  className="text-blue-600 hover:underline font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  +54 2954 393274
                </a>
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push('/dashboard/select-store')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Mis Tiendas
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push('/dashboard')}
            >
              Ir al Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SubscriptionExpiredPage() {
  return (
    <Suspense>
      <SubscriptionExpiredContent />
    </Suspense>
  )
}
