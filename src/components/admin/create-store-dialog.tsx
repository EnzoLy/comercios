'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createStoreSchema, type CreateStoreInput } from '@/lib/validations/admin-store.schema'
import { Loader2 } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
}

export function CreateStoreDialog({
  isOpen,
  onOpenChange,
  onSuccess,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [users, setUsers] = useState<User[]>([])

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<CreateStoreInput>({
    resolver: zodResolver(createStoreSchema),
  })

  useEffect(() => {
    if (isOpen) loadUsers()
  }, [isOpen])

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) setUsers(await res.json())
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }

  const onSubmit = async (data: CreateStoreInput) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/admin/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || 'Error al crear tienda')
        return
      }

      toast.success('Tienda creada exitosamente')
      reset()
      onSuccess()
    } catch (error) {
      toast.error('Error al crear tienda')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const slug = e.target.value.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
    setValue('slug', slug)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Nueva Tienda</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Nombre</Label>
            <Input {...register('name')} onChange={handleNameChange} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div>
            <Label>Slug (URL)</Label>
            <Input {...register('slug')} />
            {errors.slug && <p className="text-sm text-red-500">{errors.slug.message}</p>}
          </div>
          <div>
            <Label>Owner</Label>
            <Select onValueChange={(v) => setValue('ownerId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar owner" />
              </SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.ownerId && <p className="text-sm text-red-500">{errors.ownerId.message}</p>}
          </div>
          <div>
            <Label>Email (opcional)</Label>
            <Input type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <div>
            <Label>Teléfono (opcional)</Label>
            <Input {...register('phone')} />
            {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
          </div>
          <div>
            <Label>Descripción (opcional)</Label>
            <Textarea {...register('description')} rows={3} />
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando...</> : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
