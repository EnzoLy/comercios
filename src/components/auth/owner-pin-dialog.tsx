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
import { AlertCircle, Lock } from 'lucide-react'

interface OwnerPinDialogProps {
  isOpen: boolean
  userName: string
  onSuccess: () => void
  onNoPin: () => void
  onCancel?: () => void
}

const PIN_LENGTH = 4

export function OwnerPinDialog({
  isOpen,
  userName,
  onSuccess,
  onNoPin,
  onCancel,
}: OwnerPinDialogProps) {
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setPin('')
      setError('')
      // Focus input on dialog open
      setTimeout(() => {
        const input = document.getElementById('owner-pin-input') as HTMLInputElement
        input?.focus()
      }, 100)
    }
  }, [isOpen])

  // Handle keyboard input
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle number keys and backspace
      if (/^\d$/.test(e.key)) {
        e.preventDefault()
        if (pin.length < PIN_LENGTH) {
          const newPin = pin + e.key
          setPin(newPin)
          setError('')

          // Auto-submit when complete
          if (newPin.length === PIN_LENGTH) {
            submitPin(newPin)
          }
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        if (pin.length > 0) {
          setPin(pin.slice(0, -1))
        }
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (pin.length === PIN_LENGTH) {
          submitPin(pin)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        if (onCancel) onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, pin])

  const submitPin = async (pinToSubmit: string) => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/validate-owner-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinToSubmit }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Special case: owner doesn't have PIN configured
        if (data.error === 'owner_has_no_pin') {
          onNoPin()
          return
        }

        setError(data.message || 'PIN incorrecto')
        setPin('')
        toast.error(data.message || 'PIN incorrecto')
        return
      }

      if (data.success) {
        toast.success('PIN verificado. Bienvenido!')
        onSuccess()
      }
    } catch (err) {
      setError('Error validando PIN')
      toast.error('Error validando PIN')
      setPin('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length === PIN_LENGTH && !isLoading) {
      submitPin(pin)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel?.()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Verificar Propietario
          </DialogTitle>
          <DialogDescription>
            Ingresa tu PIN de seguridad para continuar, {userName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* PIN Display */}
          <div className="text-center">
            <div className="text-5xl tracking-widest font-mono font-bold mb-2">
              {'●'.repeat(pin.length)}
              {Array(PIN_LENGTH - pin.length)
                .fill(0)
                .map((_, i) => (
                  <span key={i} className="text-gray-300">
                    ○
                  </span>
                ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {PIN_LENGTH - pin.length} dígitos restantes
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Hidden Input for keyboard input */}
          <input
            id="owner-pin-input"
            type="password"
            value={pin}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH)
              setPin(value)
              if (value.length === PIN_LENGTH) {
                submitPin(value)
              }
            }}
            inputMode="numeric"
            maxLength={PIN_LENGTH}
            placeholder="Ingresa PIN aquí..."
            className="text-center text-lg tracking-widest font-mono"
            disabled={isLoading}
            autoComplete="off"
          />

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
            <p>💡 Escribe los 4 dígitos de tu PIN en el campo de arriba</p>
            <p className="text-xs mt-1">Se enviará automáticamente al completar</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            {onCancel && (
              <Button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            )}
            <Button
              type="submit"
              disabled={pin.length !== PIN_LENGTH || isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isLoading ? 'Verificando...' : 'Enviar PIN'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
