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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createPurchaseOrderSchema, type CreatePurchaseOrderInput } from '@/lib/validations/purchase-order.schema'
import { PurchaseOrderStatus } from '@/lib/db/entities/purchase-order.entity'
import { useStore } from '@/hooks/use-store'
import { Loader2, Plus, Trash2, Package, Calculator, Truck, FileText, Store, Calendar, ShoppingCart, Send, Save, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { ProductSearchInput } from '@/components/products/product-search-input'
import { cn } from '@/lib/utils'

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

  const calculateItemSubtotal = (item: any) => {
    if (!item.quantityOrdered || !item.unitPrice) return 0
    const itemTotal = item.quantityOrdered * item.unitPrice
    const discount = (itemTotal * (item.discountPercentage || 0)) / 100
    return itemTotal - discount
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* Header Section */}
      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm rounded-3xl overflow-hidden">
        <div className="h-2 bg-primary w-full" />
        <CardHeader>
          <div className="flex items-center gap-3 mb-2 text-primary">
            <Store className="h-5 w-5" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Contexto Global</p>
          </div>
          <CardTitle className="text-2xl font-black tracking-tight">Información del Suministro</CardTitle>
          <CardDescription>Define qué proveedor abastecerá esta orden y los tiempos estimados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="supplierId" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Proveedor Obligatorio</Label>
              <Select
                value={selectedSupplierId}
                onValueChange={(value) => setValue('supplierId', value)}
                disabled={isLoading || mode === 'edit'}
              >
                <SelectTrigger className="h-11 rounded-xl bg-secondary/50 border-border focus:ring-primary font-bold">
                  <SelectValue placeholder="Elegir Proveedor" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id} className="rounded-lg font-medium">
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.supplierId && (
                <p className="text-[10px] font-black text-rose-500 uppercase px-1">{errors.supplierId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderDate" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Fecha Emisión</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="orderDate"
                  type="date"
                  className="pl-9 h-11 rounded-xl bg-secondary/50 border-border font-bold"
                  {...register('orderDate')}
                  disabled={isLoading}
                />
              </div>
              {errors.orderDate && (
                <p className="text-[10px] font-black text-rose-500 uppercase px-1">{String(errors.orderDate.message)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedDeliveryDate" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 text-indigo-500">Promesa Entrega</Label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500/50" />
                <Input
                  id="expectedDeliveryDate"
                  type="date"
                  className="pl-9 h-11 rounded-xl bg-secondary/50 border-indigo-500/20 font-bold focus:border-indigo-500 transition-colors"
                  {...register('expectedDeliveryDate')}
                  disabled={isLoading}
                />
              </div>
              {errors.expectedDeliveryDate && (
                <p className="text-[10px] font-black text-rose-500 uppercase px-1">{String(errors.expectedDeliveryDate.message)}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Section */}
      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm rounded-3xl overflow-hidden">
        <CardHeader className="bg-secondary/20 border-b border-border">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-indigo-500" />
              <div>
                <CardTitle className="text-xl font-bold">Listado de Productos</CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-tight opacity-60">Control de cantidades y costos directos</CardDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              disabled={isLoading || !selectedSupplierId}
              className="rounded-xl border-indigo-500/20 hover:bg-indigo-500/10 hover:text-indigo-500 font-bold h-9 transition-all"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!selectedSupplierId ? (
            <div className="py-20 flex flex-col items-center opacity-30 text-center px-8">
              <ShoppingCart className="h-12 w-12 mb-4" />
              <p className="font-black uppercase tracking-widest text-xs">Selecciona un proveedor para habilitar la carga</p>
            </div>
          ) : fields.length === 0 ? (
            <div className="py-20 flex flex-col items-center text-center px-8">
              <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4 text-muted-foreground opacity-20">
                <Plus className="h-8 w-8" />
              </div>
              <p className="font-bold text-sm text-muted-foreground mb-4">La lista está vacía</p>
              <Button onClick={addItem} variant="secondary" className="rounded-xl font-black uppercase text-[10px] px-6">
                Comenzar Carga
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary/10">
                    <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Producto / SKU</th>
                    <th className="text-center py-4 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-28">Cantidad</th>
                    <th className="text-right py-4 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-32">Costo Unit.</th>
                    <th className="text-right py-4 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-24">Dcto %</th>
                    <th className="text-right py-4 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-36">Subtotal</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {fields.map((field, index) => {
                    const item = items[index]
                    const itemSubtotal = calculateItemSubtotal(item)
                    const excludeIds = items
                      .map((i, idx) => idx !== index ? i.productId : null)
                      .filter(Boolean) as string[]

                    return (
                      <tr key={field.id} className="group hover:bg-primary/5 transition-colors">
                        <td className="py-4 px-6">
                          <ProductSearchInput
                            value={item.productId || ''}
                            onChange={(value) => handleProductChange(index, value)}
                            storeId={store?.storeId || ''}
                            disabled={isLoading}
                            placeholder="Buscar en el catálogo..."
                            excludeIds={excludeIds}
                            error={errors.items?.[index]?.productId?.message}
                            className="bg-transparent border-none shadow-none focus-visible:ring-0 px-0 font-bold text-sm h-8"
                          />
                        </td>
                        <td className="py-4 px-4">
                          <Input
                            type="number"
                            min="1"
                            className="h-9 text-center font-black rounded-xl bg-secondary/50 border-border/30 focus:border-primary transition-all tabular-nums"
                            {...register(`items.${index}.quantityOrdered`, { valueAsNumber: true })}
                            disabled={isLoading}
                          />
                        </td>
                        <td className="py-4 px-4">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground opacity-50">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="h-9 text-right font-black rounded-xl bg-secondary/50 border-border/30 pl-6 tabular-nums"
                              {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                              disabled={isLoading}
                            />
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            className="h-9 text-right font-black text-rose-500 rounded-xl bg-rose-500/5 border-rose-500/20 tabular-nums"
                            {...register(`items.${index}.discountPercentage`, { valueAsNumber: true })}
                            disabled={isLoading}
                          />
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="text-sm font-black tabular-nums">{formatCurrency(itemSubtotal)}</span>
                        </td>
                        <td className="py-4 pr-4">
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            disabled={isLoading}
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Notes Section */}
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm rounded-3xl overflow-hidden h-fit">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Observaciones</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                id="notes"
                placeholder="Indica condiciones de pago, transportista o notas especiales..."
                className="min-h-[140px] rounded-2xl bg-secondary/30 border-border focus:ring-primary font-medium resize-none shadow-inner"
                {...register('notes')}
                disabled={isLoading}
              />
            </CardContent>
          </Card>

          {/* Logistics Summary Card */}
          <Card className="border-none shadow-xl bg-slate-900 text-white rounded-3xl overflow-hidden p-6 relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Truck className="h-16 w-16" />
            </div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Cargos Logísticos</p>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-white/30">Impuestos (IVA)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-8 bg-white/5 border-white/10 text-xs font-bold rounded-lg"
                      {...register('taxAmount', { valueAsNumber: true })}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-white/30">Flete / Envío</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-8 bg-white/5 border-white/10 text-xs font-bold rounded-lg"
                      {...register('shippingCost', { valueAsNumber: true })}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Totals Section */}
        <Card className="border-none shadow-2xl bg-primary text-white rounded-[2.5rem] overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <ShoppingCart className="h-40 w-40" />
          </div>
          <CardHeader className="relative z-10 pb-4">
            <CardTitle className="text-xl font-bold border-b border-white/20 pb-4">Consolidado Final</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 space-y-6 flex-1">
            <div className="space-y-4">
              <div className="flex justify-between items-center opacity-70">
                <span className="text-sm font-black uppercase tracking-tighter">Mercadería (Neto)</span>
                <span className="font-mono font-black">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center opacity-70">
                <span className="text-sm font-black uppercase tracking-tighter">Cargos Adicionales</span>
                <span className="font-mono font-black">+{formatCurrency(Number(taxAmount) + Number(shippingCost))}</span>
              </div>
            </div>

            <div className="pt-8 border-t border-white/20">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Total de la Orden</p>
              <div className="text-5xl font-black tabular-nums tracking-tighter">
                {formatCurrency(total)}
              </div>
            </div>
          </CardContent>
          <div className="p-8 bg-black/10 backdrop-blur-sm grid grid-cols-2 gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleSubmit((data) => {
                data.status = PurchaseOrderStatus.DRAFT
                onSubmit(data)
              })}
              disabled={isLoading}
              className="rounded-2xl h-12 bg-white/5 border-white/20 text-white hover:bg-white/20 active:scale-95 transition-all font-black uppercase text-[10px] tracking-widest"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Borrador
            </Button>
            <Button
              type="button"
              onClick={handleSubmit((data) => {
                data.status = PurchaseOrderStatus.SENT
                onSubmit(data)
              })}
              disabled={isLoading}
              className="rounded-2xl h-12 bg-white text-primary border-none hover:bg-slate-100 shadow-xl shadow-black/20 active:scale-95 transition-all font-black uppercase text-[10px] tracking-widest"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Send className="h-4 w-4 mr-2" />}
              Lanzar Orden
            </Button>
          </div>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 border-t bg-background/80 backdrop-blur-md md:hidden flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 rounded-xl h-11"
          onClick={() => router.back()}
        >
          <X className="h-4 w-4 mr-2" /> Salir
        </Button>
      </div>
    </form>
  )
}
