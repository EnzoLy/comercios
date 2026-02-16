'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useStore } from '@/hooks/use-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Store, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function StoreInfoForm() {
  const store = useStore()
  const router = useRouter()
  const { update: updateSession } = useSession()
  const [storeName, setStoreName] = useState('')
  const [storeSlug, setStoreSlug] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  useEffect(() => {
    if (store?.storeId) {
      fetchStoreInfo()
    }
  }, [store?.storeId])

  const fetchStoreInfo = async () => {
    if (!store?.storeId) return

    setIsFetching(true)
    try {
      const response = await fetch(`/api/stores/${store.storeId}/info`)
      if (response.ok) {
        const data = await response.json()
        setStoreName(data.name)
        setStoreSlug(data.slug)
      }
    } catch (error) {
      console.error('Error fetching store info:', error)
      toast.error('Error al cargar información de la tienda')
    } finally {
      setIsFetching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!storeName.trim()) {
      toast.error('El nombre de la tienda es requerido')
      return
    }

    if (!storeSlug.trim()) {
      toast.error('El slug es requerido')
      return
    }

    // Validar formato del slug (solo letras, números y guiones)
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    if (!slugRegex.test(storeSlug)) {
      toast.error('El slug solo puede contener letras minúsculas, números y guiones')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/stores/${store?.storeId}/info`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: storeName.trim(),
          slug: storeSlug.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar')
      }

      toast.success('Información actualizada correctamente')

      // Actualizar la sesión para reflejar los cambios
      await updateSession()

      // Si el slug cambió, redirigir a la nueva URL
      if (storeSlug !== store?.slug) {
        toast.info('Redirigiendo a la nueva URL...')
        // Esperar un momento para que la sesión se actualice
        setTimeout(() => {
          router.push(`/dashboard/${storeSlug}/settings`)
          router.refresh()
        }, 1500)
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error('Update error:', error)
      toast.error(error instanceof Error ? error.message : 'Error al actualizar')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSlugChange = (value: string) => {
    // Convertir a minúsculas y reemplazar espacios por guiones
    const sanitized = value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
    setStoreSlug(sanitized)
  }

  if (isFetching) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Información de la Tienda
          </CardTitle>
          <CardDescription>
            Actualiza el nombre y el slug de tu tienda
          </CardDescription>
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
          <Store className="h-5 w-5" />
          Información de la Tienda
        </CardTitle>
        <CardDescription>
          Actualiza el nombre y el slug de tu tienda
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Cambiar el slug modificará la URL de tu tienda. Asegúrate de actualizar cualquier enlace guardado.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="storeName">Nombre de la Tienda</Label>
            <Input
              id="storeName"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Mi Tienda"
              disabled={isLoading}
              required
            />
            <p className="text-xs text-muted-foreground">
              El nombre que se mostrará en toda la aplicación
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="storeSlug">Slug (URL)</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/dashboard/</span>
              <Input
                id="storeSlug"
                value={storeSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="mi-tienda"
                disabled={isLoading}
                required
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Solo letras minúsculas, números y guiones. Ejemplo: mi-tienda-2024
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={fetchStoreInfo}
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
