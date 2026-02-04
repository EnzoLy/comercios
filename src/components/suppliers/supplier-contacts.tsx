'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { createSupplierContactSchema, type CreateSupplierContactInput } from '@/lib/validations/supplier-contact.schema'
import { Plus, Mail, Phone, User, Edit2, Trash2, Loader2, Star } from 'lucide-react'

interface SupplierContact {
  id: string
  name: string
  position?: string
  email?: string
  phone?: string
  mobilePhone?: string
  isPrimary: boolean
  isActive: boolean
  notes?: string
  createdAt: Date
  updatedAt: Date
}

interface SupplierContactsProps {
  supplierId: string
  initialContacts: any[]
  storeId: string
}

export function SupplierContacts({ supplierId, initialContacts, storeId }: SupplierContactsProps) {
  const router = useRouter()
  const [contacts, setContacts] = useState<SupplierContact[]>(initialContacts)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingContact, setEditingContact] = useState<SupplierContact | null>(null)
  const [deletingContact, setDeletingContact] = useState<SupplierContact | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateSupplierContactInput>({
    resolver: zodResolver(createSupplierContactSchema),
    defaultValues: {
      isActive: true,
      isPrimary: false,
    },
  })

  const openCreateDialog = () => {
    setEditingContact(null)
    reset({
      name: '',
      position: '',
      email: '',
      phone: '',
      mobilePhone: '',
      isPrimary: false,
      isActive: true,
      notes: '',
    })
    setIsDialogOpen(true)
  }

  const openEditDialog = (contact: SupplierContact) => {
    setEditingContact(contact)
    reset({
      name: contact.name,
      position: contact.position || '',
      email: contact.email || '',
      phone: contact.phone || '',
      mobilePhone: contact.mobilePhone || '',
      isPrimary: contact.isPrimary,
      isActive: contact.isActive,
      notes: contact.notes || '',
    })
    setIsDialogOpen(true)
  }

  const onSubmit = async (data: CreateSupplierContactInput) => {
    setIsLoading(true)

    try {
      const url = editingContact
        ? `/api/stores/${storeId}/suppliers/${supplierId}/contacts/${editingContact.id}`
        : `/api/stores/${storeId}/suppliers/${supplierId}/contacts`

      const method = editingContact ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || `Error al ${editingContact ? 'actualizar' : 'crear'} contacto`)
        return
      }

      toast.success(`Contacto ${editingContact ? 'actualizado' : 'creado'} exitosamente`)

      // Refresh contacts
      const contactsResponse = await fetch(`/api/stores/${storeId}/suppliers/${supplierId}/contacts`)
      const updatedContacts = await contactsResponse.json()
      setContacts(updatedContacts)

      setIsDialogOpen(false)
      router.refresh()
    } catch (error) {
      toast.error('Ocurrió un error. Por favor intenta de nuevo.')
      console.error('Contact error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingContact) return

    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/stores/${storeId}/suppliers/${supplierId}/contacts/${deletingContact.id}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const result = await response.json()
        toast.error(result.error || 'Error al eliminar contacto')
        return
      }

      toast.success('Contacto eliminado exitosamente')

      // Update local state
      setContacts(contacts.filter((c) => c.id !== deletingContact.id))
      setDeletingContact(null)
      router.refresh()
    } catch (error) {
      toast.error('Ocurrió un error. Por favor intenta de nuevo.')
      console.error('Delete contact error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetPrimary = async (contactId: string) => {
    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/stores/${storeId}/suppliers/${supplierId}/contacts/${contactId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPrimary: true }),
        }
      )

      if (!response.ok) {
        const result = await response.json()
        toast.error(result.error || 'Error al establecer contacto principal')
        return
      }

      toast.success('Contacto principal actualizado')

      // Refresh contacts
      const contactsResponse = await fetch(`/api/stores/${storeId}/suppliers/${supplierId}/contacts`)
      const updatedContacts = await contactsResponse.json()
      setContacts(updatedContacts)

      router.refresh()
    } catch (error) {
      toast.error('Ocurrió un error. Por favor intenta de nuevo.')
      console.error('Set primary error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Contactos del Proveedor</h3>
          <p className="text-sm text-muted-foreground">
            Administra los contactos y personas clave del proveedor
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Contacto
        </Button>
      </div>

      {contacts.length === 0 ? (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="text-lg font-semibold mb-2">No hay contactos</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Comienza agregando el primer contacto del proveedor
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Contacto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contacts.map((contact) => (
            <Card
              key={contact.id}
              style={{ borderColor: 'var(--color-primary)' }}
              className={!contact.isActive ? 'opacity-60' : ''}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{contact.name}</CardTitle>
                      {contact.isPrimary && (
                        <Badge variant="default" className="gap-1">
                          <Star className="h-3 w-3 fill-white" />
                          Principal
                        </Badge>
                      )}
                      {!contact.isActive && (
                        <Badge variant="secondary">Inactivo</Badge>
                      )}
                    </div>
                    {contact.position && (
                      <CardDescription>{contact.position}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(contact)}
                      disabled={isLoading}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingContact(contact)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {contact.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-primary hover:underline"
                    >
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${contact.phone}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {contact.phone}
                    </a>
                  </div>
                )}
                {contact.mobilePhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${contact.mobilePhone}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {contact.mobilePhone} (Móvil)
                    </a>
                  </div>
                )}
                {contact.notes && (
                  <p className="text-xs text-muted-foreground mt-2">{contact.notes}</p>
                )}
                {!contact.isPrimary && contact.isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => handleSetPrimary(contact.id)}
                    disabled={isLoading}
                  >
                    <Star className="mr-2 h-3 w-3" />
                    Establecer como Principal
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Editar Contacto' : 'Agregar Contacto'}
            </DialogTitle>
            <DialogDescription>
              {editingContact
                ? 'Actualiza la información del contacto'
                : 'Agrega un nuevo contacto para este proveedor'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo *</Label>
              <Input
                id="name"
                placeholder="Ej: Juan Pérez"
                {...register('name')}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Cargo / Posición</Label>
              <Input
                id="position"
                placeholder="Ej: Gerente de Ventas"
                {...register('position')}
                disabled={isLoading}
              />
              {errors.position && (
                <p className="text-sm text-red-500">{errors.position.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@ejemplo.com"
                  {...register('email')}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  placeholder="(555) 123-4567"
                  {...register('phone')}
                  disabled={isLoading}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobilePhone">Teléfono Móvil</Label>
              <Input
                id="mobilePhone"
                placeholder="(555) 123-4567"
                {...register('mobilePhone')}
                disabled={isLoading}
              />
              {errors.mobilePhone && (
                <p className="text-sm text-red-500">{errors.mobilePhone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                placeholder="Notas adicionales sobre este contacto"
                rows={3}
                {...register('notes')}
                disabled={isLoading}
              />
              {errors.notes && (
                <p className="text-sm text-red-500">{errors.notes.message}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPrimary"
                {...register('isPrimary')}
                disabled={isLoading}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isPrimary" className="cursor-pointer">
                Contacto Principal
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                {...register('isActive')}
                disabled={isLoading}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Activo
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingContact ? 'Actualizar' : 'Crear'} Contacto
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingContact} onOpenChange={() => setDeletingContact(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar contacto?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás por eliminar el contacto <strong>{deletingContact?.name}</strong>.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
