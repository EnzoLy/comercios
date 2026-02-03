'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/hooks/use-store'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'

export function TaxSettingsForm() {
  const store = useStore()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [taxEnabled, setTaxEnabled] = useState(false)
  const [defaultTaxRate, setDefaultTaxRate] = useState('0')
  const [taxName, setTaxName] = useState('IVA')

  // Fetch current tax settings
  useEffect(() => {
    if (!store) return

    const fetchTaxSettings = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/stores/${store.storeId}/tax-settings`)
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error al cargar configuración')
        }

        const data = await response.json()
        setTaxEnabled(data.taxEnabled)
        setDefaultTaxRate(data.defaultTaxRate.toString())
        setTaxName(data.taxName)
      } catch (error) {
        console.error('Error:', error)
        toast.error('Error al cargar configuración de impuestos')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTaxSettings()
  }, [store])

  const handleSave = async () => {
    if (!store) return

    // Validar datos
    const rate = parseFloat(defaultTaxRate)
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error('La tasa debe estar entre 0 y 100')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/stores/${store.storeId}/tax-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxEnabled,
          defaultTaxRate: rate,
          taxName,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al guardar')
      }

      toast.success('Configuración de impuestos guardada correctamente')
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
          <CardTitle>Impuestos Globales</CardTitle>
          <CardDescription>
            Configura los impuestos que se aplicarán por defecto a todos los productos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Habilitar impuestos */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="text-base font-medium">Habilitar Impuestos</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Activar cálculo de impuestos en transacciones
              </p>
            </div>
            <Switch
              checked={taxEnabled}
              onCheckedChange={setTaxEnabled}
              disabled={isSaving}
            />
          </div>

          {/* Nombre del impuesto */}
          <div className="space-y-2">
            <Label htmlFor="taxName">Nombre del Impuesto</Label>
            <Input
              id="taxName"
              placeholder="Ej: IVA, GST, Sales Tax..."
              value={taxName}
              onChange={(e) => setTaxName(e.target.value)}
              disabled={!taxEnabled || isSaving}
              maxLength={100}
            />
            <p className="text-sm text-muted-foreground">
              Nombre del impuesto que aparecerá en los recibos y reportes
            </p>
          </div>

          {/* Tasa de impuesto por defecto */}
          <div className="space-y-2">
            <Label htmlFor="taxRate">Tasa de Impuesto por Defecto (%)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="taxRate"
                type="number"
                placeholder="0"
                value={defaultTaxRate}
                onChange={(e) => setDefaultTaxRate(e.target.value)}
                disabled={!taxEnabled || isSaving}
                min="0"
                max="100"
                step="0.01"
                className="flex-1"
              />
              <span className="text-sm font-medium text-muted-foreground">%</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Esta tasa se aplicará automáticamente a todos los productos, a menos que establezcan su propia tasa
            </p>
          </div>

          {/* Información de preview */}
          {taxEnabled && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Ejemplo:</strong> Con un producto de $100 y un {taxName} del {defaultTaxRate}%,
                el total será ${(100 + (100 * parseFloat(defaultTaxRate)) / 100).toFixed(2)}
              </p>
            </div>
          )}

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
          <CardTitle>Información sobre Impuestos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <h4 className="font-medium text-foreground mb-2">Impuestos Globales vs. Impuestos por Producto</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Los impuestos globales se aplican a todos los productos por defecto</li>
              <li>Puedes establecer una tasa diferente para productos individuales en su página de edición</li>
              <li>Los impuestos específicos del producto sobrescriben la tasa global</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-2">Cálculo de Impuestos</h4>
            <p>
              Los impuestos se calculan sobre el precio de venta del producto.
              El monto del impuesto se muestra por separado en los recibos y analíticas.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-2">Estados Deshabilitados</h4>
            <p>
              Si deshabilitas los impuestos, no se aplicará ningún impuesto a tus productos,
              independientemente de las configuraciones individuales.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
