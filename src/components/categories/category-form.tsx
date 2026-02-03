'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createCategorySchema, type CreateCategoryInput } from '@/lib/validations/category.schema'
import { useStore } from '@/hooks/use-store'
import { Loader2 } from 'lucide-react'

interface CategoryFormProps {
  isOpen: boolean
  onClose: () => void
  category?: any
  categories: any[]
  onSuccess?: () => void
}

export function CategoryForm({
  isOpen,
  onClose,
  category,
  categories,
  onSuccess,
}: CategoryFormProps) {
  const router = useRouter()
  const store = useStore()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: category || {
      sortOrder: 0,
      isActive: true,
    },
  })

  const selectedParentId = watch('parentId')

  // Filter out current category and its children from parent options
  const availableParents = categories.filter((c) => {
    if (!category) return true
    return c.id !== category.id && c.parentId !== category.id
  })

  const onSubmit = async (data: CreateCategoryInput) => {
    if (!store) return

    setIsLoading(true)

    try {
      const url = category
        ? `/api/stores/${store.storeId}/categories/${category.id}`
        : `/api/stores/${store.storeId}/categories`

      const response = await fetch(url, {
        method: category ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || `Error al ${category ? 'actualizar' : 'crear'} la categoría`)
        return
      }

      toast.success(`Categoría ${category ? 'actualizada' : 'creada'} exitosamente!`)
      onClose()
      onSuccess?.()
      router.refresh()
    } catch (error) {
      toast.error('Ocurrió un error. Por favor intenta de nuevo.')
      console.error('Category form error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Editar Categoría' : 'Crear Categoría'}</DialogTitle>
          <DialogDescription>
            {category ? 'Actualizar información de la categoría' : 'Agrega una nueva categoría para organizar productos'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la Categoría *</Label>
            <Input
              id="name"
              placeholder="Ingresa el nombre de la categoría"
              {...register('name')}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              placeholder="Descripción de la categoría"
              {...register('description')}
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="parentId">Categoría Padre</Label>
            <Select
              value={selectedParentId || 'none'}
              onValueChange={(value) => setValue('parentId', value === 'none' ? undefined : value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar padre (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin padre (Nivel superior)</SelectItem>
                {availableParents.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.parent ? `${cat.parent.name} > ` : ''}{cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.parentId && (
              <p className="text-sm text-red-500">{errors.parentId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sortOrder">Orden</Label>
            <Input
              id="sortOrder"
              type="number"
              placeholder="0"
              {...register('sortOrder', { valueAsNumber: true })}
              disabled={isLoading}
            />
            {errors.sortOrder && (
              <p className="text-sm text-red-500">{errors.sortOrder.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {category ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
