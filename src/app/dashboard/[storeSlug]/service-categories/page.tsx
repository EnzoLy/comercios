'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ServiceCategory {
  id: string
  name: string
  description: string
  color: string
  _count?: { services: number }
}

export default function ServiceCategoriesPage() {
  const params = useParams()
  const storeSlug = params.storeSlug as string

  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', color: '#3b82f6' })

  useEffect(() => {
    fetchCategories()
  }, [storeSlug])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const storeRes = await fetch(`/api/stores?slug=${storeSlug}`)
      const stores = await storeRes.json()
      const res = await fetch(`/api/stores/${stores[0].id}/service-categories`)
      const data = await res.json()
      setCategories(data)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const storeRes = await fetch(`/api/stores?slug=${storeSlug}`)
      const stores = await storeRes.json()
      const storeId = stores[0].id

      if (editingId) {
        await fetch(
          `/api/stores/${storeId}/service-categories/${editingId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          }
        )
      } else {
        await fetch(`/api/stores/${storeId}/service-categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      }

      setOpen(false)
      setEditingId(null)
      setFormData({ name: '', description: '', color: '#3b82f6' })
      fetchCategories()
    } catch (error) {
      console.error('Failed to save category:', error)
      alert('Error al guardar la categoría')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const storeRes = await fetch(`/api/stores?slug=${storeSlug}`)
      const stores = await storeRes.json()
      await fetch(`/api/stores/${stores[0].id}/service-categories/${deleteId}`, {
        method: 'DELETE',
      })
      setDeleteId(null)
      fetchCategories()
    } catch (error) {
      console.error('Failed to delete category:', error)
    }
  }

  const openEditDialog = (category: ServiceCategory) => {
    setEditingId(category.id)
    setFormData({
      name: category.name,
      description: category.description,
      color: category.color,
    })
    setOpen(true)
  }

  const openNewDialog = () => {
    setEditingId(null)
    setFormData({ name: '', description: '', color: '#3b82f6' })
    setOpen(true)
  }

  return (
    <div className="p-4 md:p-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categorías de Servicios</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Organiza tus servicios por categorías
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openNewDialog}>
              <Plus className="h-4 w-4" />
              Nueva Categoría
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ej: Peluquería"
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
                  placeholder="Descripción de la categoría"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="h-10 w-20 rounded border cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingId ? 'Guardar' : 'Crear'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-gray-50 dark:bg-gray-900">
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Servicios</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex justify-center">
                    <TableSkeleton />
                  </div>
                </TableCell>
              </TableRow>
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No hay categorías
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id} className="border-b">
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                    {category.description}
                  </TableCell>
                  <TableCell>
                    <div
                      className="h-6 w-6 rounded border"
                      style={{ backgroundColor: category.color }}
                    />
                  </TableCell>
                  <TableCell>{category._count?.services || 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(category)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteId(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Eliminar Categoría</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro? Los servicios en esta categoría pasarán a no tener
            categoría.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">
              Eliminar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  )
}
