'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/hooks/use-store'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'

interface ProductTaxConfigProps {
  productId: string
  onTaxUpdated?: () => void
}

export function ProductTaxConfig({ productId, onTaxUpdated }: ProductTaxConfigProps) {
  const store = useStore()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [overrideTaxRate, setOverrideTaxRate] = useState(false)
  const [taxRate, setTaxRate] = useState('0')
  const [defaultTaxRate, setDefaultTaxRate] = useState('0')

  // Fetch product tax settings and default tax rate
  useEffect(() => {
    if (!store || !productId) return

    const fetchTaxSettings = async () => {
      setIsLoading(true)
      try {
        // Fetch product tax settings
        const productResponse = await fetch(
          `/api/stores/${store.storeId}/products/${productId}/tax`
        )
        if (productResponse.ok) {
          const productData = await productResponse.json()
          setOverrideTaxRate(productData.overrideTaxRate)
          setTaxRate(productData.taxRate !== null ? productData.taxRate.toString() : '0')
        }

        // Fetch store default tax rate
        const storeResponse = await fetch(`/api/stores/${store.storeId}/tax-settings`)
        if (storeResponse.ok) {
          const storeData = await storeResponse.json()
          setDefaultTaxRate(storeData.defaultTaxRate.toString())
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTaxSettings()
  }, [store, productId])

  const handleSave = async () => {
    if (!store) return

    const rate = overrideTaxRate ? parseFloat(taxRate) : null
    if (overrideTaxRate && (isNaN(rate!) || rate! < 0 || rate! > 100)) {
      toast.error('La tasa debe estar entre 0 y 100')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/stores/${store.storeId}/products/${productId}/tax`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxRate: rate,
          overrideTaxRate,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al guardar')
      }

      toast.success('Impuestos del producto guardados correctamente')
      onTaxUpdated?.()
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
    <Card>
      <CardHeader>
        <CardTitle>Configuración de Impuestos</CardTitle>
        <CardDescription>
          Establece una tasa de impuesto específica para este producto
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Usar tasa por defecto o personalizada */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label className="text-base font-medium">Usar Tasa Personalizada</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Sobrescribir la tasa de impuesto global ({defaultTaxRate}%)
            </p>
          </div>
          <Switch
            checked={overrideTaxRate}
            onCheckedChange={setOverrideTaxRate}
            disabled={isSaving}
          />
        </div>

        {/* Tasa de impuesto personalizada */}
        {overrideTaxRate && (
          <div className="space-y-2">
            <Label htmlFor="taxRate">Tasa de Impuesto para este Producto (%)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="taxRate"
                type="number"
                placeholder="0"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                disabled={isSaving}
                min="0"
                max="100"
                step="0.01"
                className="flex-1"
              />
              <span className="text-sm font-medium text-muted-foreground">%</span>
            </div>
          </div>
        )}

        {/* Información de tasa aplicable */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Tasa de impuesto aplicable:</strong>{' '}
            {overrideTaxRate ? `${taxRate}%` : `${defaultTaxRate}% (tasa global)`}
          </p>
        </div>

        {/* Botón guardar */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar Impuestos
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
