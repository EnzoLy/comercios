'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface PinPadDialogProps {
  isOpen: boolean
  employeeName: string
  employmentId: string
  storeId: string
  onSuccess: () => void
  onCancel: () => void
}

const PIN_LENGTH = 4

export function PinPadDialog({
  isOpen,
  employeeName,
  employmentId,
  storeId,
  onSuccess,
  onCancel
}: PinPadDialogProps) {
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [attemptsRemaining, setAttemptsRemaining] = useState(3)
  const [isBlocked, setIsBlocked] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setPin('')
      setError('')
      setAttemptsRemaining(3)
      setIsBlocked(false)
    }
  }, [isOpen])

  const handleNumberClick = (num: string) => {
    if (pin.length < PIN_LENGTH && !isBlocked && !isLoading) {
      const newPin = pin + num
      setPin(newPin)

      // Auto-submit when PIN is complete
      if (newPin.length === PIN_LENGTH) {
        submitPin(newPin)
      }
    }
  }

  const handleBackspace = () => {
    if (pin.length > 0 && !isBlocked && !isLoading) {
      setPin(pin.slice(0, -1))
      setError('')
    }
  }

  const submitPin = async (pinToSubmit: string) => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(
        `/api/stores/${storeId}/employments/validate-pin`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employmentId,
            pin: pinToSubmit
          })
        }
      )

      if (response.status === 429) {
        setIsBlocked(true)
        setError('PIN bloqueado por 5 minutos')
        toast.error('PIN bloqueado. Intenta de nuevo en 5 minutos.')
        return
      }

      if (!response.ok) {
        const data = await response.json()
        setAttemptsRemaining(data.attemptsRemaining || 0)
        setError(data.message || 'PIN incorrecto')
        setPin('')
        toast.error(data.message || 'PIN incorrecto')
        return
      }

      const data = await response.json()
      if (data.success) {
        toast.success(`Bienvenido, ${employeeName}!`)
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

  const buttons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['←', '0', '✓']
  ]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Verificar PIN - {employeeName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* PIN Display */}
          <div className="text-center">
            <div className="text-4xl tracking-widest font-mono">
              {'●'.repeat(pin.length)}
              {Array(PIN_LENGTH - pin.length)
                .fill(0)
                .map((_, i) => (
                  <span key={i} className="text-gray-300">
                    ○
                  </span>
                ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 text-center font-medium">
              {error}
              {attemptsRemaining > 0 && !isBlocked && (
                <div>Te quedan {attemptsRemaining} intento{attemptsRemaining === 1 ? '' : 's'}</div>
              )}
            </div>
          )}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2">
            {buttons.map((row, rowIdx) => (
              <div key={rowIdx} className="contents">
                {row.map((btn) => {
                  if (btn === '←') {
                    return (
                      <Button
                        key={btn}
                        onClick={handleBackspace}
                        disabled={pin.length === 0 || isBlocked || isLoading}
                        variant="outline"
                        className="h-14"
                      >
                        ← Atrás
                      </Button>
                    )
                  }

                  if (btn === '✓') {
                    return (
                      <Button
                        key={btn}
                        onClick={() => submitPin(pin)}
                        disabled={pin.length !== PIN_LENGTH || isBlocked || isLoading}
                        className="h-14 bg-green-600 hover:bg-green-700"
                      >
                        ✓ OK
                      </Button>
                    )
                  }

                  return (
                    <Button
                      key={btn}
                      onClick={() => handleNumberClick(btn)}
                      disabled={pin.length >= PIN_LENGTH || isBlocked || isLoading}
                      variant="outline"
                      className="h-14 text-lg font-semibold"
                    >
                      {btn}
                    </Button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Cancel Button */}
          <Button
            onClick={onCancel}
            disabled={isLoading}
            variant="ghost"
            className="w-full"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
