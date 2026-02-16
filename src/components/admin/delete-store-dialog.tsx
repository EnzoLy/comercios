'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface DeleteStoreDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  storeId: string
  storeName: string
  storeSlug: string
}

export function DeleteStoreDialog({
  isOpen,
  onOpenChange,
  onSuccess,
  storeId,
  storeName,
  storeSlug,
}: DeleteStoreDialogProps) {
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (confirmText !== storeSlug) {
      toast.error('El texto de confirmación no coincide')
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/stores/${storeId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar')
      }

      toast.success('Tienda eliminada exitosamente')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(error instanceof Error ? error.message : 'Error al eliminar la tienda')
    } finally {
      setIsDeleting(false)
      setConfirmText('')
    }
  }

  const handleCancel = () => {
    setConfirmText('')
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Eliminar Tienda Permanentemente
          </DialogTitle>
          <DialogDescription>
            Esta acción es <strong className="text-destructive">IRREVERSIBLE</strong> y eliminará todos los datos asociados a esta tienda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <strong>ADVERTENCIA:</strong> Esta operación eliminará PERMANENTEMENTE:
            </AlertDescription>
          </Alert>

          <div className="pl-4 space-y-2 text-sm">
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Todos los productos</strong> y sus códigos de barras</li>
              <li><strong>Todas las categorías</strong> de productos</li>
              <li><strong>Todos los proveedores</strong> y sus datos</li>
              <li><strong>Todas las ventas</strong> y facturas</li>
              <li><strong>Todos los movimientos de inventario</strong></li>
              <li><strong>Todos los empleados</strong> y turnos</li>
              <li><strong>Todas las órdenes de compra</strong></li>
              <li><strong>Todos los pagos de suscripción</strong></li>
              <li><strong>La tienda completa</strong> y su configuración</li>
            </ul>
          </div>

          <Alert>
            <AlertDescription>
              <strong>Tienda a eliminar:</strong> {storeName} (/{storeSlug})
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="confirm" className="text-sm font-medium">
              Para confirmar, escribe el slug de la tienda: <code className="bg-muted px-2 py-1 rounded text-sm font-mono">{storeSlug}</code>
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={storeSlug}
              disabled={isDeleting}
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || confirmText !== storeSlug}
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Permanentemente
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
