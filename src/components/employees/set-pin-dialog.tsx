'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { AlertCircle, Loader2 } from 'lucide-react'

interface SetPinDialogProps {
  isOpen: boolean
  employeeId: string
  employmentId: string
  employeeName: string
  storeId: string
  onSuccess: () => void
  onOpenChange: (open: boolean) => void
}

export function SetPinDialog({
  isOpen,
  employeeId,
  employmentId,
  employeeName,
  storeId,
  onSuccess,
  onOpenChange,
}: SetPinDialogProps) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validatePin = (value: string): string | null => {
    if (!/^\d{4}$/.test(value)) {
      return 'El PIN debe tener exactamente 4 dígitos'
    }

    const weakPins = [
      '0000', '1111', '2222', '3333', '4444', '5555',
      '6666', '7777', '8888', '9999', '1234', '4321',
      '1357', '2468', '9876', '0123'
    ]

    if (weakPins.includes(value)) {
      return 'Este PIN es muy débil. Elige otro.'
    }

    return null
  }

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}

    // Validate PIN
    const pinError = validatePin(pin)
    if (pinError) {
      newErrors.pin = pinError
    }

    // Validate confirmation
    if (!confirmPin) {
      newErrors.confirmPin = 'Debes confirmar el PIN'
    } else if (pin !== confirmPin) {
      newErrors.confirmPin = 'Los PINs no coinciden'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const response = await fetch(
        `/api/stores/${storeId}/employments/${employmentId}/set-pin`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin, confirmPin })
        }
      )

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Error al configurar PIN')
        return
      }

      toast.success(`PIN configurado para ${employeeName}`)
      setPin('')
      setConfirmPin('')
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast.error('Error al configurar PIN')
      console.error('Error setting PIN:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar PIN</DialogTitle>
          <DialogDescription>
            Empleado: <span className="font-semibold">{employeeName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              El PIN debe tener exactamente 4 dígitos numéricos. Evita patrones simples como 0000, 1234, etc.
            </AlertDescription>
          </Alert>

          {/* PIN Input */}
          <div className="space-y-2">
            <Label htmlFor="pin">PIN de 4 dígitos</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="0000"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ''))
                if (errors.pin) {
                  const { pin: _, ...rest } = errors
                  setErrors(rest)
                }
              }}
              disabled={isLoading}
              className={errors.pin ? 'border-red-500' : ''}
            />
            {errors.pin && (
              <p className="text-sm text-red-600">{errors.pin}</p>
            )}
          </div>

          {/* Confirm PIN Input */}
          <div className="space-y-2">
            <Label htmlFor="confirmPin">Confirmar PIN</Label>
            <Input
              id="confirmPin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="0000"
              value={confirmPin}
              onChange={(e) => {
                setConfirmPin(e.target.value.replace(/\D/g, ''))
                if (errors.confirmPin) {
                  const { confirmPin: _, ...rest } = errors
                  setErrors(rest)
                }
              }}
              disabled={isLoading}
              className={errors.confirmPin ? 'border-red-500' : ''}
            />
            {errors.confirmPin && (
              <p className="text-sm text-red-600">{errors.confirmPin}</p>
            )}
          </div>

          {/* PIN Display */}
          {pin && (
            <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">PIN configurado:</p>
              <div className="text-2xl font-mono tracking-widest">
                {'●'.repeat(pin.length)}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !pin || !confirmPin}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Configurando...
              </>
            ) : (
              'Configurar PIN'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
