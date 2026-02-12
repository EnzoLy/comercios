'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <AlertTriangle className="h-6 w-6" />
            <CardTitle>Algo salió mal</CardTitle>
          </div>
          <CardDescription>
            Ocurrió un error inesperado. Por favor intenta de nuevo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error.message && (
            <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
              <p className="text-sm text-red-900 dark:text-red-100 font-mono">
                {error.message}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={reset} className="flex-1">
              Intentar de Nuevo
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="flex-1"
            >
              Ir al Inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
