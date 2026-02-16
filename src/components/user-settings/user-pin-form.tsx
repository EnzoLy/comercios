'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Key, AlertCircle, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function UserPinForm() {
  const { data: session } = useSession()
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasPin, setHasPin] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    checkPinStatus()
  }, [])

  const checkPinStatus = async () => {
    setIsChecking(true)
    try {
      const response = await fetch('/api/auth/user-pin/check')
      if (response.ok) {
        const data = await response.json()
        setHasPin(data.hasPin)
      }
    } catch (error) {
      console.error('Error checking PIN status:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (hasPin && !currentPin) {
      toast.error('Ingresa tu PIN actual')
      return
    }

    if (!newPin || !confirmPin) {
      toast.error('Ingresa y confirma el nuevo PIN')
      return
    }

    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      toast.error('El PIN debe ser de 4 dígitos numéricos')
      return
    }

    if (newPin !== confirmPin) {
      toast.error('Los PINs no coinciden')
      return
    }

    if (hasPin && currentPin === newPin) {
      toast.error('El nuevo PIN debe ser diferente al actual')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/user-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPin: hasPin ? currentPin : undefined,
          newPin,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al configurar PIN')
      }

      toast.success(hasPin ? 'PIN actualizado correctamente' : 'PIN configurado correctamente')

      // Limpiar el formulario
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
      setHasPin(true)
    } catch (error) {
      console.error('Set PIN error:', error)
      toast.error(error instanceof Error ? error.message : 'Error al configurar PIN')
    } finally {
      setIsLoading(false)
    }
  }

  if (isChecking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            PIN de Usuario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          {hasPin ? 'Cambiar PIN de Usuario' : 'Configurar PIN de Usuario'}
        </CardTitle>
        <CardDescription>
          {hasPin
            ? 'Actualiza tu PIN de 4 dígitos para acceso rápido al POS'
            : 'Configura un PIN de 4 dígitos para acceso rápido al POS'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {hasPin ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Ya tienes un PIN configurado. Puedes cambiarlo ingresando tu PIN actual.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Nota:</strong> El PIN te permite acceder rápidamente al POS sin necesidad de contraseña. Debe ser de 4 dígitos.
              </AlertDescription>
            </Alert>
          )}

          {hasPin && (
            <div className="space-y-2">
              <Label htmlFor="currentPin">PIN Actual</Label>
              <Input
                id="currentPin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                disabled={isLoading}
                required
                className="text-center text-2xl tracking-widest"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newPin">Nuevo PIN</Label>
            <Input
              id="newPin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              disabled={isLoading}
              required
              className="text-center text-2xl tracking-widest"
            />
            <p className="text-xs text-muted-foreground">
              4 dígitos numéricos (0-9)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPin">Confirmar Nuevo PIN</Label>
            <Input
              id="confirmPin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              disabled={isLoading}
              required
              className="text-center text-2xl tracking-widest"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : hasPin ? 'Cambiar PIN' : 'Configurar PIN'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCurrentPin('')
                setNewPin('')
                setConfirmPin('')
              }}
              disabled={isLoading}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
