'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Service {
  id: string
  name: string
  description: string
  price: number
  duration: number
  categoryId: string | null
  isActive: boolean
}

interface ServiceCategory {
  id: string
  name: string
}

export default function EditServicePage() {
  const params = useParams()
  const router = useRouter()
  const storeSlug = params.storeSlug as string
  const serviceId = params.serviceId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [formData, setFormData] = useState<Service | null>(null)

  useEffect(() => {
    fetchData()
  }, [storeSlug, serviceId])

  const fetchData = async () => {
    try {
      const storeRes = await fetch(`/api/stores?slug=${storeSlug}`)
      const stores = await storeRes.json()
      const actualStoreId = stores[0].id

      // Fetch service
      const serviceRes = await fetch(
        `/api/stores/${actualStoreId}/services/${serviceId}`
      )
      const service = await serviceRes.json()
      setFormData(service)

      // Fetch categories
      const catRes = await fetch(
        `/api/stores/${actualStoreId}/service-categories`
      )
      const cats = await catRes.json()
      setCategories(cats)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData) return

    setSaving(true)
    try {
      const storeRes = await fetch(`/api/stores?slug=${storeSlug}`)
      const stores = await storeRes.json()
      const actualStoreId = stores[0].id

      const res = await fetch(
        `/api/stores/${actualStoreId}/services/${serviceId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      )

      if (!res.ok) throw new Error('Failed to update service')
      router.push(`/dashboard/${storeSlug}/services`)
    } catch (error) {
      console.error('Failed to update service:', error)
      alert('Error al actualizar el servicio')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div>Cargando...</div>
  if (!formData) return <div>Servicio no encontrado</div>

  return (
    <div className="max-w-2xl">
      <Link
        href={`/dashboard/${storeSlug}/services`}
        className="inline-flex items-center gap-2 mb-6 text-sm font-medium hover:opacity-80"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Servicios
      </Link>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-6">Editar Servicio</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Precio</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    price: parseFloat(e.target.value),
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duración (minutos)</Label>
              <Input
                id="duration"
                type="number"
                required
                value={formData.duration}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duration: parseInt(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <Select
              value={formData.categoryId || 'none'}
              onValueChange={(value) =>
                setFormData({ ...formData, categoryId: value === 'none' ? null : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin categoría</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
              />
              Activo
            </Label>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
