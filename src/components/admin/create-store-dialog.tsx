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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { createStoreSchema, type CreateStoreInput } from '@/lib/validations/admin-store.schema'
import { Loader2, UserPlus, Users } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
}

type OwnerOption = 'existing' | 'new'

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
  const [ownerOption, setOwnerOption] = useState<OwnerOption>('existing')

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<CreateStoreInput>({
    resolver: zodResolver(createStoreSchema),
  })

  useEffect(() => {
    if (isOpen) {
      loadUsers()
      setOwnerOption('existing')
    } else {
      reset()
      setOwnerOption('existing')
    }
  }, [isOpen])

  useEffect(() => {
    // Limpiar campos según la opción seleccionada
    if (ownerOption === 'existing') {
      setValue('ownerName', '')
      setValue('ownerEmail', '')
      setValue('ownerPassword', '')
    } else {
      setValue('ownerId', '')
    }
  }, [ownerOption, setValue])

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
          {/* Información de la Tienda */}
          <div>
            <Label>Nombre de la Tienda</Label>
            <Input {...register('name')} onChange={handleNameChange} placeholder="Mi Tienda" />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div>
            <Label>Slug (URL)</Label>
            <Input {...register('slug')} placeholder="mi-tienda" />
            {errors.slug && <p className="text-sm text-red-500">{errors.slug.message}</p>}
          </div>

          {/* Separador visual */}
          <div className="border-t pt-4">
            <Label className="text-base font-semibold mb-3 block">Propietario de la Tienda</Label>

            {/* Selector de opción */}
            <RadioGroup value={ownerOption} onValueChange={(v) => setOwnerOption(v as OwnerOption)} className="mb-4">
              <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="existing" id="existing" />
                <Label htmlFor="existing" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Users className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Seleccionar Usuario Existente</div>
                    <div className="text-xs text-muted-foreground">Elegir de usuarios ya registrados</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="new" id="new" />
                <Label htmlFor="new" className="flex items-center gap-2 cursor-pointer flex-1">
                  <UserPlus className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Crear Nuevo Usuario</div>
                    <div className="text-xs text-muted-foreground">Registrar un nuevo propietario</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {/* Campos según opción seleccionada */}
            {ownerOption === 'existing' ? (
              <div>
                <Label>Usuario</Label>
                <Select onValueChange={(v) => setValue('ownerId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar propietario" />
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
            ) : (
              <div className="space-y-3">
                <div>
                  <Label>Nombre del Propietario</Label>
                  <Input {...register('ownerName')} placeholder="Juan Pérez" />
                  {errors.ownerName && <p className="text-sm text-red-500">{errors.ownerName.message}</p>}
                </div>
                <div>
                  <Label>Email del Propietario</Label>
                  <Input type="email" {...register('ownerEmail')} placeholder="juan@ejemplo.com" />
                  {errors.ownerEmail && <p className="text-sm text-red-500">{errors.ownerEmail.message}</p>}
                </div>
                <div>
                  <Label>Contraseña Inicial</Label>
                  <Input type="password" {...register('ownerPassword')} placeholder="••••••••" />
                  {errors.ownerPassword && <p className="text-sm text-red-500">{errors.ownerPassword.message}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    El usuario deberá cambiar esta contraseña en su primer inicio de sesión
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Información adicional de la tienda */}
          <div className="border-t pt-4 space-y-3">
            <Label className="text-base font-semibold">Información Adicional (Opcional)</Label>
            <div>
              <Label>Email de la Tienda</Label>
              <Input type="email" {...register('email')} placeholder="contacto@mitienda.com" />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input {...register('phone')} placeholder="+1234567890" />
              {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea {...register('description')} rows={3} placeholder="Breve descripción de la tienda..." />
            </div>
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
