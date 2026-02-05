'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { OwnerPinDialog } from '@/components/auth/owner-pin-dialog'
import { useStore } from '@/hooks/use-store'
import { Trash2, AlertTriangle, Package, ShoppingCart, Shield } from 'lucide-react'

type ResetType = 'sales' | 'products' | 'all' | null

export function ResetSettingsForm() {
  const store = useStore()
  const { data: session } = useSession()
  const [isResetting, setIsResetting] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ResetType>(null)
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [pendingResetType, setPendingResetType] = useState<ResetType>(null)
  const [pinVerified, setPinVerified] = useState(false)
  const [hasOwnerPin, setHasOwnerPin] = useState<boolean | null>(null)

  // Check if owner has PIN configured
  useEffect(() => {
    const checkOwnerPin = async () => {
      try {
        const response = await fetch('/api/auth/check-owner-pin')
        if (response.ok) {
          const data = await response.json()
          setHasOwnerPin(data.hasPin)
        }
      } catch (error) {
        console.error('Error checking owner PIN:', error)
      }
    }

    checkOwnerPin()
  }, [])

  const handleResetClick = (type: ResetType) => {
    // If owner has PIN configured, show PIN dialog first
    if (hasOwnerPin) {
      setPendingResetType(type)
      setShowPinDialog(true)
    } else {
      // If no PIN configured, go directly to confirmation dialog
      setConfirmDialog(type)
    }
  }

  const handlePinSuccess = () => {
    setShowPinDialog(false)
    setPinVerified(true)
    // After PIN is verified, show the confirmation dialog
    setConfirmDialog(pendingResetType)
  }

  const handlePinNoPin = () => {
    // Owner doesn't have PIN, proceed to confirmation
    setShowPinDialog(false)
    setPinVerified(true)
    setConfirmDialog(pendingResetType)
  }

  const handlePinCancel = () => {
    setShowPinDialog(false)
    setPendingResetType(null)
    setPinVerified(false)
  }

  const handleReset = async (type: ResetType) => {
    if (!store || !type) return

    setIsResetting(true)
    try {
      const response = await fetch(`/api/stores/${store.storeId}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Error al resetear')
        return
      }

      toast.success(result.message || 'Reset completado exitosamente')

      // Reload page to reflect changes
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error('Reset error:', error)
      toast.error('Error al resetear')
    } finally {
      setIsResetting(false)
      setConfirmDialog(null)
      setPendingResetType(null)
      setPinVerified(false)
    }
  }

  const handleConfirmDialogClose = () => {
    setConfirmDialog(null)
    setPendingResetType(null)
    setPinVerified(false)
  }

  const getDialogContent = (type: ResetType) => {
    switch (type) {
      case 'sales':
        return {
          title: '¿Eliminar todas las ventas?',
          description: 'Esta acción eliminará TODAS las ventas registradas de forma permanente. Esta acción NO se puede deshacer.',
          action: 'Eliminar Ventas',
        }
      case 'products':
        return {
          title: '¿Eliminar todos los productos?',
          description: 'Esta acción eliminará TODOS los productos del inventario de forma permanente. Esta acción NO se puede deshacer.',
          action: 'Eliminar Productos',
        }
      case 'all':
        return {
          title: '¿Reset completo de la tienda?',
          description: 'Esta acción eliminará TODAS las ventas Y TODOS los productos de forma permanente. Esta acción NO se puede deshacer y la tienda quedará vacía.',
          action: 'Reset Completo',
        }
      default:
        return {
          title: '',
          description: '',
          action: '',
        }
    }
  }

  const dialogContent = confirmDialog ? getDialogContent(confirmDialog) : null

  return (
    <>
      {/* PIN Security Notice */}
      {hasOwnerPin !== null && (
        <Card className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className={`h-5 w-5 mt-0.5 ${hasOwnerPin ? 'text-green-600' : 'text-amber-600'}`} />
              <div>
                <p className="font-medium text-sm">
                  {hasOwnerPin
                    ? '🔒 Seguridad Activada: Se requiere PIN del propietario'
                    : '⚠️ Sin PIN: Las operaciones de reset no requieren PIN'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasOwnerPin
                    ? 'Todas las operaciones de reset requerirán verificación de tu PIN de seguridad.'
                    : 'Configura un PIN en tu perfil para mayor seguridad en operaciones críticas.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <CardTitle className="text-red-600">Zona de Peligro</CardTitle>
          </div>
          <CardDescription>
            Estas acciones son irreversibles y eliminarán datos permanentemente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Reset Sales */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Eliminar Todas las Ventas</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Elimina todas las ventas registradas en esta tienda
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => handleResetClick('sales')}
              disabled={isResetting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar Ventas
            </Button>
          </div>

          {/* Reset Products */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Eliminar Todos los Productos</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Elimina todos los productos del inventario de esta tienda
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => handleResetClick('products')}
              disabled={isResetting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar Productos
            </Button>
          </div>

          {/* Reset All */}
          <div className="flex items-center justify-between p-4 border-2 border-red-300 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950/20">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <h3 className="font-semibold text-red-600">Reset Completo</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Elimina TODAS las ventas Y TODOS los productos. La tienda quedará vacía.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => handleResetClick('all')}
              disabled={isResetting}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Reset Completo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Owner PIN Dialog */}
      <OwnerPinDialog
        isOpen={showPinDialog}
        userName={session?.user?.name || 'Usuario'}
        onSuccess={handlePinSuccess}
        onNoPin={handlePinNoPin}
        onCancel={handlePinCancel}
      />

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmDialog} onOpenChange={handleConfirmDialogClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {dialogContent?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>{dialogContent?.description}</p>
              <p className="font-semibold text-red-600">
                ⚠️ ADVERTENCIA: Esta acción es irreversible
              </p>
              {pinVerified && hasOwnerPin && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  PIN verificado correctamente
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleReset(confirmDialog)}
              disabled={isResetting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isResetting ? 'Eliminando...' : dialogContent?.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
