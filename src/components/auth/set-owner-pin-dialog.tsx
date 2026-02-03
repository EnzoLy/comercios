'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { AlertCircle, Lock, CheckCircle } from 'lucide-react'

interface SetOwnerPinDialogProps {
  isOpen: boolean
  userName: string
  onSuccess: () => void
  onCancel?: () => void
}

const PIN_LENGTH = 4

export function SetOwnerPinDialog({
  isOpen,
  userName,
  onSuccess,
  onCancel,
}: SetOwnerPinDialogProps) {
  const [step, setStep] = useState<'create' | 'confirm'>('create')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setStep('create')
      setPin('')
      setConfirmPin('')
      setError('')
      // Focus input
      setTimeout(() => {
        const input = document.getElementById('owner-pin-create') as HTMLInputElement
        input?.focus()
      }, 100)
    }
  }, [isOpen])

  // Handle keyboard input
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) {
        e.preventDefault()
        const currentPin = step === 'create' ? pin : confirmPin
        if (currentPin.length < PIN_LENGTH) {
          if (step === 'create') {
            const newPin = pin + e.key
            setPin(newPin)
            if (newPin.length === PIN_LENGTH) {
              setStep('confirm')
              setTimeout(() => {
                const input = document.getElementById('owner-pin-confirm') as HTMLInputElement
                input?.focus()
              }, 100)
            }
          } else {
            const newConfirmPin = confirmPin + e.key
            setConfirmPin(newConfirmPin)
          }
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        if (step === 'create' && pin.length > 0) {
          setPin(pin.slice(0, -1))
        } else if (step === 'confirm' && confirmPin.length > 0) {
          setConfirmPin(confirmPin.slice(0, -1))
        } else if (step === 'confirm' && confirmPin.length === 0) {
          // Go back to create
          setStep('create')
          setTimeout(() => {
            const input = document.getElementById('owner-pin-create') as HTMLInputElement
            input?.focus()
          }, 100)
        }
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (step === 'create' && pin.length === PIN_LENGTH) {
          setStep('confirm')
          setTimeout(() => {
            const input = document.getElementById('owner-pin-confirm') as HTMLInputElement
            input?.focus()
          }, 100)
        } else if (step === 'confirm' && confirmPin.length === PIN_LENGTH) {
          handleSubmit()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        if (onCancel) onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, step, pin, confirmPin])

  const handleSubmit = async () => {
    setError('')

    if (pin !== confirmPin) {
      setError('Los PINs no coinciden')
      setConfirmPin('')
      setStep('create')
      setTimeout(() => {
        const input = document.getElementById('owner-pin-create') as HTMLInputElement
        input?.focus()
      }, 100)
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/set-owner-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Error configurando PIN')
        toast.error(data.error || 'Error configurando PIN')
        return
      }

      toast.success('PIN configurado correctamente')
      onSuccess()
    } catch (err) {
      setError('Error configurando PIN')
      toast.error('Error configurando PIN')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel?.()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Configurar PIN de Seguridad
          </DialogTitle>
          <DialogDescription>
            Crea un PIN de 4 dígitos para proteger tu cuenta, {userName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step Indicator */}
          <div className="flex gap-2">
            <div
              className={`flex-1 h-2 rounded-full transition-colors ${step === 'create' ? 'bg-blue-600' : 'bg-gray-300'
                }`}
            />
            <div
              className={`flex-1 h-2 rounded-full transition-colors ${step === 'confirm' ? 'bg-blue-600' : 'bg-gray-300'
                }`}
            />
          </div>

          {/* PIN Display */}
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {step === 'create' ? 'Nuevo PIN' : 'Confirmar PIN'}
            </p>
            <div className="text-5xl tracking-widest font-mono font-bold">
              {step === 'create' ? (
                <>
                  {'●'.repeat(pin.length)}
                  {Array(PIN_LENGTH - pin.length)
                    .fill(0)
                    .map((_, i) => (
                      <span key={i} className="text-gray-300">
                        ○
                      </span>
                    ))}
                </>
              ) : (
                <>
                  {'●'.repeat(confirmPin.length)}
                  {Array(PIN_LENGTH - confirmPin.length)
                    .fill(0)
                    .map((_, i) => (
                      <span key={i} className="text-gray-300">
                        ○
                      </span>
                    ))}
                </>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Hidden Input for keyboard input */}
          {step === 'create' && (
            <input
              id="owner-pin-create"
              type="password"
              value={pin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH)
                setPin(value)
                if (value.length === PIN_LENGTH) {
                  setStep('confirm')
                  setTimeout(() => {
                    const input = document.getElementById(
                      'owner-pin-confirm'
                    ) as HTMLInputElement
                    input?.focus()
                  }, 100)
                }
              }}
              inputMode="numeric"
              maxLength={PIN_LENGTH}
              placeholder="Ingresa PIN aquí..."
              className="text-center text-lg tracking-widest font-mono"
              disabled={isLoading}
              autoComplete="off"
            />
          )}

          {step === 'confirm' && (
            <input
              id="owner-pin-confirm"
              type="password"
              value={confirmPin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH)
                setConfirmPin(value)
              }}
              inputMode="numeric"
              maxLength={PIN_LENGTH}
              placeholder="Confirma PIN aquí..."
              className="text-center text-lg tracking-widest font-mono"
              disabled={isLoading}
              autoComplete="off"
            />
          )}

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
            <p>💡 Usa el teclado para ingresar los 4 dígitos</p>
            {step === 'create' && (
              <p className="text-xs mt-1">Se avanzará automáticamente al confirmar</p>
            )}
            {step === 'confirm' && (
              <p className="text-xs mt-1">Presiona Enter o completa los 4 dígitos</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            {onCancel && (
              <Button
                onClick={onCancel}
                disabled={isLoading}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            )}
            {step === 'confirm' && (
              <>
                <Button
                  onClick={() => {
                    setStep('create')
                    setConfirmPin('')
                    setTimeout(() => {
                      const input = document.getElementById(
                        'owner-pin-create'
                      ) as HTMLInputElement
                      input?.focus()
                    }, 100)
                  }}
                  disabled={isLoading}
                  variant="outline"
                  className="flex-1"
                >
                  Atrás
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={confirmPin.length !== PIN_LENGTH || isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? 'Configurando...' : 'Confirmar'}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
