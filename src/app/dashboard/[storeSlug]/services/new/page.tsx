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

interface ServiceCategory {
  id: string
  name: string
}

export default function NewServicePage() {
  const params = useParams()
  const router = useRouter()
  const storeSlug = params.storeSlug as string
  const storeId = (params.storeId as string) || ''

  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    isActive: true,
  })

  useEffect(() => {
    fetchCategories()
    fetchStoreId()
  }, [storeSlug])

  const fetchStoreId = async () => {
    try {
      const res = await fetch(`/api/stores?slug=${storeSlug}`)
      const data = await res.json()
      // Store ID is available but we'll use it from API call
    } catch (error) {
      console.error('Failed to fetch store:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/stores?slug=${storeSlug}`)
      const stores = await res.json()
      if (stores[0]) {
        const catRes = await fetch(
          `/api/stores/${stores[0].id}/service-categories`
        )
        const data = await catRes.json()
        setCategories(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const storeRes = await fetch(`/api/stores?slug=${storeSlug}`)
      const stores = await storeRes.json()
      const actualStoreId = stores[0].id

      const res = await fetch(`/api/stores/${actualStoreId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          categoryId: formData.categoryId || null,
        }),
      })

      if (!res.ok) throw new Error('Failed to create service')
      router.push(`/dashboard/${storeSlug}/services`)
    } catch (error) {
      console.error('Failed to create service:', error)
      alert('Error al crear el servicio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl">
        <Link
          href={`/dashboard/${storeSlug}/services`}
          className="inline-flex items-center gap-2 mb-6 text-sm font-medium hover:opacity-80"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Servicios
        </Link>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-6">Nuevo Servicio</h1>

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
              placeholder="Ej: Corte de cabello"
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
              placeholder="Descripción del servicio"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Precio</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              required
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: e.target.value })
              }
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoría (opcional)</Label>
            <Select
              value={formData.categoryId || 'none'}
              onValueChange={(value) =>
                setFormData({ ...formData, categoryId: value === 'none' ? '' : value })
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

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Servicio'}
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
    </div>
  )
}
