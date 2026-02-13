'use client'

import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, ArrowLeft, Mail } from 'lucide-react'
import Link from 'next/link'

export default function SubscriptionExpiredPage() {
  const params = useParams()
  const router = useRouter()
  const storeSlug = params.storeSlug as string

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
                <span>
                  El período de suscripción de esta tienda ha finalizado
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">•</span>
                <span>
                  No se pueden realizar operaciones como ventas, inventario o gestión de productos
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">•</span>
                <span>
                  Los datos de la tienda están seguros y no se perderán
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-3 text-blue-900 flex items-center gap-2">
              <Mail className="h-5 w-5" />
              ¿Cómo renovar la suscripción?
            </h3>
            <p className="text-gray-700 mb-4">
              Para renovar la suscripción y restaurar el acceso a esta tienda, contacta con el
              administrador del sistema:
            </p>
            <div className="bg-white rounded-md p-4 border border-blue-200">
              <p className="font-mono text-sm text-gray-800">
                Correo: <a href="mailto:admin@tuempresa.com" className="text-blue-600 hover:underline">
                  admin@tuempresa.com
                </a>
              </p>
              <p className="font-mono text-sm text-gray-800 mt-2">
                Teléfono: <a href="tel:+1234567890" className="text-blue-600 hover:underline">
                  +123 456 7890
                </a>
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push('/dashboard/select-store')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Selección de Tiendas
            </Button>
            <Button
              className="flex-1"
              onClick={() => router.push('/dashboard')}
            >
              Ir al Dashboard Principal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
