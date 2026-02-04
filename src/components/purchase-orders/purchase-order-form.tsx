'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createPurchaseOrderSchema, type CreatePurchaseOrderInput, type PurchaseOrderItemInput } from '@/lib/validations/purchase-order.schema'
import { PurchaseOrderStatus } from '@/lib/db/entities/purchase-order.entity'
import { useStore } from '@/hooks/use-store'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'

interface PurchaseOrderFormProps {
  mode: 'create' | 'edit'
  suppliers: any[]
  products: any[]
  defaultSupplierId?: string
  purchaseOrder?: any
}

export function PurchaseOrderForm({
  mode,
  suppliers,
  products,
  defaultSupplierId,
  purchaseOrder,
}: PurchaseOrderFormProps) {
  const router = useRouter()
  const store = useStore()
  const [isLoading, setIsLoading] = useState(false)
  const [supplierProducts, setSupplierProducts] = useState<any[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<CreatePurchaseOrderInput>({
    resolver: zodResolver(createPurchaseOrderSchema),
    defaultValues: purchaseOrder
      ? {
        supplierId: purchaseOrder.supplierId,
        orderDate: new Date(purchaseOrder.orderDate).toISOString().split('T')[0],
        expectedDeliveryDate: purchaseOrder.expectedDeliveryDate
          ? new Date(purchaseOrder.expectedDeliveryDate).toISOString().split('T')[0]
          : undefined,
        taxAmount: Number(purchaseOrder.taxAmount) || 0,
        shippingCost: Number(purchaseOrder.shippingCost) || 0,
        notes: purchaseOrder.notes,
        status: purchaseOrder.status as PurchaseOrderStatus,
        items: purchaseOrder.items?.map((item: any) => ({
          productId: item.productId,
          quantityOrdered: item.quantityOrdered,
          unitPrice: Number(item.unitPrice),
          discountPercentage: Number(item.discountPercentage) || 0,
          taxRate: item.taxRate ? Number(item.taxRate) : undefined,
          notes: item.notes,
        })) || [],
      }
      : {
        supplierId: defaultSupplierId || '',
        orderDate: new Date().toISOString().split('T')[0],
        taxAmount: 0,
        shippingCost: 0,
        status: PurchaseOrderStatus.DRAFT,
        items: [],
      },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const selectedSupplierId = watch('supplierId')
  const items = watch('items')
  const taxAmount = watch('taxAmount') || 0
  const shippingCost = watch('shippingCost') || 0

  // Fetch supplier products when supplier changes
  useEffect(() => {
    if (selectedSupplierId && store) {
      fetch(`/api/stores/${store.storeId}/suppliers/${selectedSupplierId}/products`)
        .then((res) => res.json())
        .then((data) => {
          setSupplierProducts(data.products || [])
        })
        .catch((error) => {
          console.error('Error fetching supplier products:', error)
        })
    } else {
      setSupplierProducts([])
    }
  }, [selectedSupplierId, store])

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    if (!item.quantityOrdered || !item.unitPrice) return sum
    const itemTotal = item.quantityOrdered * item.unitPrice
    const discount = (itemTotal * (item.discountPercentage || 0)) / 100
    return sum + (itemTotal - discount)
  }, 0)

  const total = subtotal + Number(taxAmount) + Number(shippingCost)

  const addItem = () => {
    append({
      productId: '',
      quantityOrdered: 1,
      unitPrice: 0,
      discountPercentage: 0,
    })
  }

  // Fetch last price when product is selected
  const handleProductChange = async (index: number, productId: string) => {
    setValue(`items.${index}.productId`, productId)

    if (!selectedSupplierId || !store) return

    try {
      const response = await fetch(
        `/api/stores/${store.storeId}/suppliers/${selectedSupplierId}/products/${productId}/prices`
      )
      const data = await response.json()

      if (response.ok && data.prices && data.prices.length > 0) {
        // Get the most recent price
        const lastPrice = data.prices[0].unitPrice
        setValue(`items.${index}.unitPrice`, Number(lastPrice))
      }
    } catch (error) {
      console.error('Error fetching last price:', error)
    }
  }

  const onSubmit = async (data: CreatePurchaseOrderInput) => {
    if (!store) {
      toast.error('Store context not found')
      return
    }

    if (data.items.length === 0) {
      toast.error('Agrega al menos un producto a la orden')
      return
    }

    setIsLoading(true)

    try {
      const url =
        mode === 'create'
          ? `/api/stores/${store.storeId}/purchase-orders`
          : `/api/stores/${store.storeId}/purchase-orders/${purchaseOrder?.id}`

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || `Error al ${mode === 'create' ? 'crear' : 'actualizar'} orden`)
        return
      }

      toast.success(`Orden ${mode === 'create' ? 'creada' : 'actualizada'} exitosamente`)
      router.push(`/dashboard/${store.slug}/purchase-orders/${result.id}`)
      router.refresh()
    } catch (error) {
      toast.error('Ocurrió un error. Por favor intenta de nuevo.')
      console.error(`${mode} purchase order error:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  const getProductById = (productId: string) => {
    return products.find((p) => p.id === productId)
  }

  const calculateItemSubtotal = (item: any) => {
    if (!item.quantityOrdered || !item.unitPrice) return 0
    const itemTotal = item.quantityOrdered * item.unitPrice
    const discount = (itemTotal * (item.discountPercentage || 0)) / 100
    return itemTotal - discount
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Orden</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supplierId">Proveedor *</Label>
            <Select
              value={selectedSupplierId}
              onValueChange={(value) => setValue('supplierId', value)}
              disabled={isLoading || mode === 'edit'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proveedor" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.supplierId && (
              <p className="text-sm text-red-500">{errors.supplierId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderDate">Fecha de Orden *</Label>
              <Input
                id="orderDate"
                type="date"
                {...register('orderDate')}
                disabled={isLoading}
              />
              {errors.orderDate && (
                <p className="text-sm text-red-500">{String(errors.orderDate.message)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedDeliveryDate">Fecha de Entrega Esperada</Label>
              <Input
                id="expectedDeliveryDate"
                type="date"
                {...register('expectedDeliveryDate')}
                disabled={isLoading}
              />
              {errors.expectedDeliveryDate && (
                <p className="text-sm text-red-500">
                  {String(errors.expectedDeliveryDate.message)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Productos</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              disabled={isLoading || !selectedSupplierId}
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar Producto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedSupplierId && (
            <p className="text-sm text-gray-500 text-center py-4">
              Selecciona un proveedor para agregar productos
            </p>
          )}

          {selectedSupplierId && fields.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No hay productos agregados. Haz clic en "Agregar Producto" para comenzar.
            </p>
          )}

          {fields.length > 0 && (
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Producto</th>
                    <th className="text-center py-2 px-2">Cantidad</th>
                    <th className="text-right py-2 px-2">Precio Unit.</th>
                    <th className="text-right py-2 px-2">Descuento %</th>
                    <th className="text-right py-2 px-2">Subtotal</th>
                    <th className="text-center py-2 px-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => {
                    const item = items[index]
                    const itemSubtotal = calculateItemSubtotal(item)

                    return (
                      <tr key={field.id} className="border-b">
                        <td className="py-2 px-2">
                          <Select
                            value={item.productId}
                            onValueChange={(value) => handleProductChange(index, value)}
                            disabled={isLoading}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} - {product.sku}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.items?.[index]?.productId && (
                            <p className="text-xs text-red-500 mt-1">
                              {errors.items[index]?.productId?.message}
                            </p>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            min="1"
                            className="w-20"
                            {...register(`items.${index}.quantityOrdered`, {
                              valueAsNumber: true,
                            })}
                            disabled={isLoading}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-24 text-right"
                            {...register(`items.${index}.unitPrice`, {
                              valueAsNumber: true,
                            })}
                            disabled={isLoading}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            className="w-20 text-right"
                            {...register(`items.${index}.discountPercentage`, {
                              valueAsNumber: true,
                            })}
                            disabled={isLoading}
                          />
                        </td>
                        <td className="py-2 px-2 text-right font-medium">
                          {formatCurrency(itemSubtotal)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Totals Section */}
      <Card>
        <CardHeader>
          <CardTitle>Totales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taxAmount">Impuesto</Label>
              <Input
                id="taxAmount"
                type="number"
                step="0.01"
                min="0"
                {...register('taxAmount', { valueAsNumber: true })}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shippingCost">Costo de Envío</Label>
              <Input
                id="shippingCost"
                type="number"
                step="0.01"
                min="0"
                {...register('shippingCost', { valueAsNumber: true })}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Impuesto:</span>
              <span className="font-medium">{formatCurrency(Number(taxAmount))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Envío:</span>
              <span className="font-medium">{formatCurrency(Number(shippingCost))}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle>Notas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Textarea
              id="notes"
              placeholder="Notas adicionales sobre la orden"
              rows={4}
              {...register('notes')}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleSubmit((data) => {
            data.status = PurchaseOrderStatus.DRAFT
            onSubmit(data)
          })}
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar como Borrador
        </Button>
        <Button
          type="button"
          onClick={handleSubmit((data) => {
            data.status = PurchaseOrderStatus.SENT
            onSubmit(data)
          })}
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enviar a Proveedor
        </Button>
      </div>
    </form>
  )
}
