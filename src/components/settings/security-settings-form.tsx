'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/hooks/use-store'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2, Shield, Lock } from 'lucide-react'

export function SecuritySettingsForm() {
  const store = useStore()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [requireEmployeePin, setRequireEmployeePin] = useState(true)

  // Fetch current security settings
  useEffect(() => {
    if (!store) return

    const fetchSecuritySettings = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/stores/${store.storeId}/security-settings`)
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error al cargar configuración')
        }

        const data = await response.json()
        setRequireEmployeePin(data.requireEmployeePin)
      } catch (error) {
        console.error('Error:', error)
        toast.error('Error al cargar configuración de seguridad')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSecuritySettings()
  }, [store])

  const handleSave = async () => {
    if (!store) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/stores/${store.storeId}/security-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requireEmployeePin,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al guardar')
      }

      toast.success('Configuración de seguridad guardada correctamente')
    } catch (error) {
      console.error('Error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
      toast.error(errorMsg)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Seguridad de Empleados
          </CardTitle>
          <CardDescription>
            Configura las medidas de seguridad para el acceso de empleados al sistema POS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Requerir PIN */}
          <div className="flex items-start justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-medium">Requerir PIN para Empleados</Label>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Cuando está activado, los empleados deben ingresar un PIN de 4 dígitos para acceder al POS.
                Si está desactivado, los empleados solo necesitan seleccionar su nombre sin ingresar PIN.
              </p>
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  <strong>Nota:</strong> Desactivar el PIN reduce la seguridad pero agiliza el inicio de sesión.
                  Recomendado solo para entornos de confianza.
                </p>
              </div>
            </div>
            <Switch
              checked={requireEmployeePin}
              onCheckedChange={setRequireEmployeePin}
              disabled={isSaving}
              className="ml-4 mt-1"
            />
          </div>

          {/* Botón guardar */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle>Recomendaciones de Seguridad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <h4 className="font-medium text-foreground mb-2">Con PIN Activado</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Mayor seguridad: Solo empleados autorizados pueden realizar ventas</li>
              <li>Trazabilidad: Cada venta queda registrada con el empleado que la realizó</li>
              <li>Control: Los empleados necesitan recordar su PIN de 4 dígitos</li>
              <li>Recomendado para tiendas con múltiples empleados o alto volumen de ventas</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-2">Con PIN Desactivado</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Acceso rápido: Los empleados solo seleccionan su nombre de una lista</li>
              <li>Sin necesidad de recordar PIN</li>
              <li>Menor seguridad: Cualquiera puede seleccionar cualquier nombre</li>
              <li>Recomendado solo para negocios familiares o de alta confianza</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-2">Configuración de PIN</h4>
            <p>
              Los PINs de empleados se configuran en la sección de Empleados. Cada empleado puede tener
              un PIN único de 4 dígitos. Si olvidan su PIN, un administrador puede restablecerlo.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
