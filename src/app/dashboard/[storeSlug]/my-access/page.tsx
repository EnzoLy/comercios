'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/hooks/use-store'
import { usePermission } from '@/hooks/use-permission'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GenerateQRDialog } from '@/components/employees/generate-qr-dialog'
import { QrCode, RefreshCw } from 'lucide-react'

export default function MyAccessPage() {
  const store = useStore()
  const [employment, setEmployment] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)

  useEffect(() => {
    if (store) {
      loadEmployment()
    }
  }, [store])

  const loadEmployment = async () => {
    if (!store) return

    setIsLoading(true)
    try {
      // Get the current user's employment in this store
      const response = await fetch(`/api/stores/${store.storeId}/employees`)
      if (!response.ok) throw new Error('Failed to load employment')

      const employees = await response.json()
      // Find the current user's employment
      const userSession = await fetch('/api/auth/me').then((r) => r.json())
      const currentEmployment = employees.find((e: any) => e.userId === userSession.user?.id)

      if (!currentEmployment) {
        toast.error('No se encontró tu registro de empleado')
        return
      }

      setEmployment(currentEmployment)
    } catch (error) {
      toast.error('Error al cargar tu información')
      console.error('Load employment error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
    )
  }

  if (!employment) {
    return (
      <div className="p-4 md:p-8">
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <QrCode className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No disponible</h3>
            <p className="text-gray-600 dark:text-gray-400">
              No se pudo cargar tu información de empleado
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mi Acceso</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Genera códigos QR para acceder rápidamente desde tu dispositivo móvil
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Main QR Card */}
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
              Código QR de Acceso
            </CardTitle>
            <CardDescription>
              Genera un código QR temporal para acceder sin contraseña (válido 24 horas)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Cada vez que generes un nuevo código, el anterior se desactivará automáticamente. Esto asegura que siempre tengas un único código activo.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                <p className="text-sm font-medium mb-2">Tu información</p>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p>👤 <strong>{employment.user.name}</strong></p>
                  <p>📧 {employment.user.email}</p>
                  <p>
                    🏷️ <strong>{employment.role}</strong>
                  </p>
                  <p>✅ Estado: Activo</p>
                </div>
              </div>

              <Button
                onClick={() => setQrDialogOpen(true)}
                size="lg"
                className="w-full"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <QrCode className="mr-2 h-5 w-5" />
                Generar Mi Código QR
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">¿Cómo funciona?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div
                    className="flex items-center justify-center h-8 w-8 rounded-full text-white text-sm font-semibold"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    1
                  </div>
                </div>
                <div>
                  <p className="font-medium">Genera tu código QR</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Click en el botón de arriba para crear tu código QR
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div
                    className="flex items-center justify-center h-8 w-8 rounded-full text-white text-sm font-semibold"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    2
                  </div>
                </div>
                <div>
                  <p className="font-medium">Escanea o comparte el enlace</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Puedes escanear el código QR con tu móvil o copiar el enlace de acceso directo
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div
                    className="flex items-center justify-center h-8 w-8 rounded-full text-white text-sm font-semibold"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    3
                  </div>
                </div>
                <div>
                  <p className="font-medium">Acceso inmediato</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Serás redirigido automáticamente a tu dashboard sin necesidad de ingresar contraseña
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-amber-800 dark:text-amber-300 text-xs">
              ⏰ <strong>Nota de seguridad:</strong> El código expira en 24 horas y solo se puede usar una vez. Si lo pierdes, genera uno nuevo.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QR Dialog */}
      {employment && store && (
        <GenerateQRDialog
          isOpen={qrDialogOpen}
          employmentId={employment.id}
          storeId={store.storeId}
          onOpenChange={setQrDialogOpen}
        />
      )}
    </div>
  )
}
