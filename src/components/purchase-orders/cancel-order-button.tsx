'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useStore } from '@/hooks/use-store'
import { Loader2, XCircle } from 'lucide-react'

interface CancelOrderButtonProps {
  orderId: string
  storeSlug: string
}

export function CancelOrderButton({ orderId, storeSlug }: CancelOrderButtonProps) {
  const router = useRouter()
  const store = useStore()
  const [isLoading, setIsLoading] = useState(false)

  const handleCancel = async () => {
    if (!store) {
      toast.error('Store context not found')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/stores/${store.storeId}/purchase-orders/${orderId}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'CANCELLED' }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Error al cancelar la orden')
        return
      }

      toast.success('Orden cancelada exitosamente')
      router.refresh()
    } catch (error) {
      toast.error('Ocurrió un error. Por favor intenta de nuevo.')
      console.error('Cancel order error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <XCircle className="mr-2 h-4 w-4" />
          Cancelar Orden
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción cancelará la orden de compra. Los productos no se recibirán y la orden
            quedará marcada como cancelada.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>No, volver</AlertDialogCancel>
          <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700">
            Sí, cancelar orden
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
