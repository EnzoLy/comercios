'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createSupplierSchema, type CreateSupplierInput } from '@/lib/validations/supplier.schema'
import { useStore } from '@/hooks/use-store'
import { Loader2, Star } from 'lucide-react'

interface SupplierFormProps {
  supplier?: CreateSupplierInput & { id: string }
  mode: 'create' | 'edit'
}

// Primary contact fields (these will create a SupplierContact)
interface PrimaryContactFields {
  contactName?: string
  contactPosition?: string
  contactEmail?: string
  contactPhone?: string
  contactMobilePhone?: string
}

type SupplierFormData = CreateSupplierInput & PrimaryContactFields

export function SupplierForm({ supplier, mode }: SupplierFormProps) {
  const router = useRouter()
  const store = useStore()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(createSupplierSchema),
    defaultValues: supplier
      ? {
          name: supplier.name,
          taxId: supplier.taxId,
          website: supplier.website,
          address: supplier.address,
          city: supplier.city,
          state: supplier.state,
          zipCode: supplier.zipCode,
          country: supplier.country,
          currency: supplier.currency || 'USD',
          rating: supplier.rating,
          isPreferred: supplier.isPreferred ?? false,
          notes: supplier.notes,
          isActive: supplier.isActive ?? true,
        }
      : {
          currency: 'USD',
          isPreferred: false,
          isActive: true,
        },
  })

  const rating = watch('rating')
  const isPreferred = watch('isPreferred')

  const onSubmit = async (data: SupplierFormData) => {
    if (!store) {
      toast.error('Store context not found')
      return
    }

    setIsLoading(true)

    try {
      // Extract primary contact fields
      const { contactName, contactPosition, contactEmail, contactPhone, contactMobilePhone, ...supplierData } = data

      const url =
        mode === 'create'
          ? `/api/stores/${store.storeId}/suppliers`
          : `/api/stores/${store.storeId}/suppliers/${supplier?.id}`

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierData),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || `Error al ${mode === 'create' ? 'crear' : 'actualizar'} proveedor`)
        return
      }

      // If creating and primary contact info provided, create the contact
      if (mode === 'create' && contactName && (contactEmail || contactPhone || contactMobilePhone)) {
        try {
          const contactResponse = await fetch(`/api/stores/${store.storeId}/suppliers/${result.id}/contacts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: contactName,
              position: contactPosition,
              email: contactEmail,
              phone: contactPhone,
              mobilePhone: contactMobilePhone,
              isPrimary: true,
              isActive: true,
            }),
          })

          if (!contactResponse.ok) {
            console.error('Error creating primary contact:', await contactResponse.json())
            // Don't fail the whole operation if contact creation fails
          }
        } catch (error) {
          console.error('Error creating primary contact:', error)
          // Don't fail the whole operation
        }
      }

      toast.success(`Proveedor ${mode === 'create' ? 'creado' : 'actualizado'} exitosamente`)
      router.push(`/dashboard/${store.slug}/suppliers`)
      router.refresh()
    } catch (error) {
      toast.error('Ocurrió un error. Por favor intenta de nuevo.')
      console.error(`${mode} supplier error:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  const renderStarRating = () => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setValue('rating', star)}
            disabled={isLoading}
            className="transition-colors disabled:opacity-50"
          >
            <Star
              className={`h-6 w-6 ${
                rating && rating >= star
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        {rating && (
          <button
            type="button"
            onClick={() => setValue('rating', undefined)}
            disabled={isLoading}
            className="ml-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Limpiar
          </button>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Información Básica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Proveedor *</Label>
            <Input
              id="name"
              placeholder="Ingrese el nombre del proveedor"
              {...register('name')}
              disabled={isLoading}
            />
            {errors.name?.message && (
              <p className="text-sm text-red-500">{String(errors.name.message)}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taxId">RFC / Tax ID</Label>
              <Input
                id="taxId"
                placeholder="RFC o Tax ID"
                {...register('taxId')}
                disabled={isLoading}
              />
              {errors.taxId?.message && (
                <p className="text-sm text-red-500">{String(errors.taxId.message)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Sitio Web</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://ejemplo.com"
                {...register('website')}
                disabled={isLoading}
              />
              {errors.website?.message && (
                <p className="text-sm text-red-500">{String(errors.website.message)}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              placeholder="Calle y número"
              {...register('address')}
              disabled={isLoading}
            />
            {errors.address?.message && (
              <p className="text-sm text-red-500">{String(errors.address.message)}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                placeholder="Ciudad"
                {...register('city')}
                disabled={isLoading}
              />
              {errors.city?.message && (
                <p className="text-sm text-red-500">{String(errors.city.message)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                placeholder="Estado"
                {...register('state')}
                disabled={isLoading}
              />
              {errors.state?.message && (
                <p className="text-sm text-red-500">{String(errors.state.message)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">Código Postal</Label>
              <Input
                id="zipCode"
                placeholder="CP"
                {...register('zipCode')}
                disabled={isLoading}
              />
              {errors.zipCode?.message && (
                <p className="text-sm text-red-500">{String(errors.zipCode.message)}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">País</Label>
              <Input
                id="country"
                placeholder="País"
                {...register('country')}
                disabled={isLoading}
              />
              {errors.country?.message && (
                <p className="text-sm text-red-500">{String(errors.country.message)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Moneda *</Label>
              <Select
                value={watch('currency')}
                onValueChange={(value) => setValue('currency', value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar moneda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                  <SelectItem value="MXN">MXN - Peso Mexicano</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="CAD">CAD - Dólar Canadiense</SelectItem>
                  <SelectItem value="GBP">GBP - Libra Esterlina</SelectItem>
                </SelectContent>
              </Select>
              {errors.currency?.message && (
                <p className="text-sm text-red-500">{String(errors.currency.message)}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Calificación</Label>
            {renderStarRating()}
            <p className="text-xs text-gray-500">
              Califica a tu proveedor del 1 al 5
            </p>
            {errors.rating?.message && (
              <p className="text-sm text-red-500">{String(errors.rating.message)}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPreferred"
              checked={isPreferred}
              onCheckedChange={(checked) => setValue('isPreferred', checked as boolean)}
              disabled={isLoading}
            />
            <Label htmlFor="isPreferred" className="cursor-pointer">
              Proveedor preferido
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionales sobre el proveedor"
              rows={4}
              {...register('notes')}
              disabled={isLoading}
            />
            {errors.notes?.message && (
              <p className="text-sm text-red-500">{String(errors.notes.message)}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {mode === 'create' && (
        <Card>
          <CardHeader>
            <CardTitle>Contacto Principal (Opcional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Puedes agregar el contacto principal del proveedor. Puedes agregar más contactos después.
            </p>

            <div className="space-y-2">
              <Label htmlFor="contactName">Nombre del Contacto</Label>
              <Input
                id="contactName"
                placeholder="Nombre completo"
                {...register('contactName')}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPosition">Cargo / Posición</Label>
              <Input
                id="contactPosition"
                placeholder="Ej: Gerente de Ventas"
                {...register('contactPosition')}
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="email@ejemplo.com"
                  {...register('contactEmail')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Teléfono</Label>
                <Input
                  id="contactPhone"
                  placeholder="(555) 123-4567"
                  {...register('contactPhone')}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactMobilePhone">Teléfono Móvil</Label>
              <Input
                id="contactMobilePhone"
                placeholder="(555) 123-4567"
                {...register('contactMobilePhone')}
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Crear Proveedor' : 'Actualizar Proveedor'}
        </Button>
      </div>
    </form>
  )
}
