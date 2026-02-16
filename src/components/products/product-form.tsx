'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarcodeScanner } from './barcode-scanner'
import { createProductSchema, updateProductSchema, type CreateProductInput, type UpdateProductInput } from '@/lib/validations/product.schema'
import { useStore } from '@/hooks/use-store'
import { Camera, Loader2, Plus, X, Upload, Image as ImageIcon, Link as LinkIcon } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ProductFormProps {
  product?: CreateProductInput & { id: string }
  mode: 'create' | 'edit'
  preselectedCategoryId?: string
}

export function ProductForm({ product, mode, preselectedCategoryId }: ProductFormProps) {
  const router = useRouter()
  const store = useStore()
  const [isLoading, setIsLoading] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [additionalBarcodes, setAdditionalBarcodes] = useState<string[]>([])
  const [newBarcode, setNewBarcode] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageInputMode, setImageInputMode] = useState<'url' | 'upload'>('url')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load categories
  useEffect(() => {
    if (store) {
      loadCategories()
    }
  }, [store])

  const loadCategories = async () => {
    if (!store) return

    try {
      const response = await fetch(`/api/stores/${store.storeId}/categories`)
      if (!response.ok) return

      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const schema = mode === 'edit' ? updateProductSchema : createProductSchema

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: product ? {
      name: product.name,
      sku: product.sku,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      currentStock: product.currentStock ?? 0,
      minStockLevel: product.minStockLevel ?? 10,
      trackStock: product.trackStock ?? true,
      trackExpirationDates: product.trackExpirationDates ?? false,
      isActive: product.isActive ?? true,
      isWeighedProduct: product.isWeighedProduct ?? false,
      description: product.description,
      barcode: product.barcode,
      categoryId: product.categoryId,
      supplierId: product.supplierId,
      maxStockLevel: product.maxStockLevel,
      unit: product.unit,
      imageUrl: product.imageUrl,
      additionalBarcodes: product.additionalBarcodes,
      taxRate: product.taxRate,
      overrideTaxRate: product.overrideTaxRate ?? false,
    } : {
      currentStock: 0,
      minStockLevel: 10,
      trackStock: true,
      trackExpirationDates: false,
      isActive: true,
      isWeighedProduct: false,
      overrideTaxRate: false,
    },
  })

  const selectedCategoryId = watch('categoryId')

  // Set preselected category
  useEffect(() => {
    if (preselectedCategoryId && !product) {
      setValue('categoryId', preselectedCategoryId)
    }
  }, [preselectedCategoryId, product, setValue])

  // Add logging to debug validation errors
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.error('ProductForm validation errors:', errors)
      // Show a toast for hidden errors if any
      const errorFields = Object.keys(errors)
      if (errorFields.length > 0) {
        toast.error(`Por favor revisa los campos: ${errorFields.join(', ')}`)
      }
    }
  }, [errors])

  const handleBarcodeDetected = (barcode: string) => {
    setValue('barcode', barcode)
    toast.success(`Código de barras detectado: ${barcode}`)
  }

  const addAdditionalBarcode = () => {
    if (newBarcode.trim() && !additionalBarcodes.includes(newBarcode.trim())) {
      setAdditionalBarcodes([...additionalBarcodes, newBarcode.trim()])
      setNewBarcode('')
    }
  }

  const removeAdditionalBarcode = (barcode: string) => {
    setAdditionalBarcodes(additionalBarcodes.filter((b) => b !== barcode))
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Error al subir la imagen')
        return
      }

      setValue('imageUrl', result.imageUrl)
      toast.success('Imagen subida exitosamente')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Error al subir la imagen')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = () => {
    setValue('imageUrl', '')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const onSubmit = async (data: CreateProductInput) => {
    console.log('onSubmit called with data:', data)
    if (!store) {
      console.error('Store context is missing')
      return
    }

    setIsLoading(true)

    try {
      // Incluir códigos de barras adicionales
      const dataWithBarcodes = {
        ...data,
        additionalBarcodes: additionalBarcodes.length > 0 ? additionalBarcodes : undefined,
      }

      const url =
        mode === 'create'
          ? `/api/stores/${store.storeId}/products`
          : `/api/stores/${store.storeId}/products/${product?.id}`

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataWithBarcodes),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || `Error al ${mode === 'create' ? 'crear' : 'actualizar'} producto`)
        return
      }

      toast.success(`¡Producto ${mode === 'create' ? 'creado' : 'actualizado'} exitosamente!`)
      router.push(`/dashboard/${store.slug}/products`)
      router.refresh()
    } catch (error) {
      toast.error('Ocurrió un error. Por favor intenta de nuevo.')
      console.error(`${mode} product error:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Producto *</Label>
              <Input
                id="name"
                placeholder="Ingrese el nombre del producto"
                {...register('name')}
                disabled={isLoading}
              />
              {errors.name?.message && (
                <p className="text-sm text-red-500">{String(errors.name.message)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                placeholder="Descripción del producto"
                {...register('description')}
                disabled={isLoading}
              />
              {errors.description?.message && (
                <p className="text-sm text-red-500">{String(errors.description.message)}</p>
              )}
            </div>

            <div className="space-y-3 border-t pt-4">
              <Label>Imagen del Producto</Label>

              <div className="flex gap-2 mb-3">
                <Button
                  type="button"
                  variant={imageInputMode === 'url' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImageInputMode('url')}
                  disabled={isLoading || uploadingImage}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  URL
                </Button>
                <Button
                  type="button"
                  variant={imageInputMode === 'upload' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImageInputMode('upload')}
                  disabled={isLoading || uploadingImage}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Archivo
                </Button>
              </div>

              {imageInputMode === 'url' ? (
                <div className="space-y-2">
                  <Input
                    id="imageUrl"
                    placeholder="https://ejemplo.com/imagen.jpg"
                    {...register('imageUrl')}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500">
                    Ingresa la URL de una imagen (JPG, PNG, WebP, GIF)
                  </p>
                  {errors.imageUrl?.message && (
                    <p className="text-sm text-red-500">{String(errors.imageUrl.message)}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      onChange={handleImageUpload}
                      disabled={isLoading || uploadingImage}
                      className="cursor-pointer"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Sube una imagen (JPG, PNG, WebP, GIF - máx. 5MB)
                  </p>
                </div>
              )}

              {watch('imageUrl') && (
                <div className="relative w-full max-w-xs border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <div className="relative aspect-square flex items-center justify-center p-2">
                    <img
                      src={watch('imageUrl') || ''}
                      alt="Vista previa del producto"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveImage}
                    disabled={isLoading || uploadingImage}
                    className="absolute top-2 right-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {uploadingImage && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Subiendo imagen...
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">Categoría</Label>
              <Select
                value={selectedCategoryId}
                onValueChange={(value) => setValue('categoryId', value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.parent ? `${category.parent.name} > ` : ''}{category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Selecciona una categoría para organizar mejor tus productos
              </p>
              {errors.categoryId?.message && (
                <p className="text-sm text-red-500">{String(errors.categoryId.message)}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">
                  SKU (Código Interno) *
                </Label>
                <Input
                  id="sku"
                  placeholder="Ej: CAMISA-AZUL-M, ZAPATO-001"
                  {...register('sku')}
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500">
                  Código único que usarás para identificar este producto
                </p>
                {errors.sku?.message && (
                  <p className="text-sm text-red-500">{String(errors.sku.message)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="barcode">Código de Barras (Opcional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="barcode"
                    placeholder="Ej: 7501234567890"
                    {...register('barcode')}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setScannerOpen(true)}
                    disabled={isLoading}
                    title="Escanear código de barras con cámara"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Código de barras del fabricante (si tiene). Usa 📷 para escanear.
                </p>
                {errors.barcode?.message && (
                  <p className="text-sm text-red-500">{String(errors.barcode.message)}</p>
                )}
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isWeighedProduct"
                    checked={watch('isWeighedProduct')}
                    onCheckedChange={(checked) => setValue('isWeighedProduct', checked as boolean)}
                    disabled={isLoading}
                  />
                  <Label htmlFor="isWeighedProduct" className="cursor-pointer">
                    Producto por peso (frutas, verduras, carnes, etc.)
                  </Label>
                </div>
                <p className="text-xs text-gray-500">
                  Los productos por peso se venden por kilogramo, libra, etc. El código de barras incluye el peso al momento de la venta.
                </p>

                {watch('isWeighedProduct') && (
                  <div className="space-y-2">
                    <Label htmlFor="weightUnit">Unidad de Peso</Label>
                    <select
                      id="weightUnit"
                      {...register('weightUnit')}
                      disabled={isLoading}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="kg">Kilogramos (kg)</option>
                      <option value="g">Gramos (g)</option>
                      <option value="lb">Libras (lb)</option>
                      <option value="oz">Onzas (oz)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-3 border-t pt-4">
                <Label>Códigos de Barras Adicionales</Label>
                <p className="text-xs text-gray-500">
                  Agrega códigos de barras alternativos (diferentes proveedores, presentaciones, etc.)
                </p>

                <div className="flex gap-2">
                  <Input
                    placeholder="Ej: 7801234567890"
                    value={newBarcode}
                    onChange={(e) => setNewBarcode(e.target.value)}
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addAdditionalBarcode()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={addAdditionalBarcode}
                    disabled={isLoading || !newBarcode.trim()}
                    title="Agregar código"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {additionalBarcodes.length > 0 && (
                  <div className="space-y-2">
                    {additionalBarcodes.map((barcode, index) => (
                      <div key={index} className="flex items-center justify-between gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <span className="text-sm font-mono">{barcode}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAdditionalBarcode(barcode)}
                          disabled={isLoading}
                          title="Eliminar código"
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Precios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="costPrice">Precio de Costo *</Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('costPrice', { valueAsNumber: true })}
                  disabled={isLoading}
                />
                {errors.costPrice?.message && (
                  <p className="text-sm text-red-500">{String(errors.costPrice.message)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sellingPrice">Precio de Venta *</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('sellingPrice', { valueAsNumber: true })}
                  disabled={isLoading}
                />
                {errors.sellingPrice?.message && (
                  <p className="text-sm text-red-500">{String(errors.sellingPrice.message)}</p>
                )}
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="overrideTaxRate"
                  checked={watch('overrideTaxRate')}
                  onCheckedChange={(checked) => setValue('overrideTaxRate', checked as boolean)}
                  disabled={isLoading}
                />
                <Label htmlFor="overrideTaxRate" className="cursor-pointer">
                  Configurar tasa de impuesto personalizada para este producto
                </Label>
              </div>
              <p className="text-xs text-gray-500">
                Por defecto, se usa la tasa de impuesto configurada en la tienda. Activa esta opción para usar una tasa diferente.
              </p>

              {watch('overrideTaxRate') && (
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tasa de Impuesto (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.01"
                    placeholder="Ej: 16.00 para IVA del 16%"
                    {...register('taxRate', { valueAsNumber: true })}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500">
                    Ingresa el porcentaje de impuesto (ej: 16 para 16%, 8 para 8%)
                  </p>
                  {errors.taxRate?.message && (
                    <p className="text-sm text-red-500">{String(errors.taxRate.message)}</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentStock">Stock Actual</Label>
                <Input
                  id="currentStock"
                  type="number"
                  placeholder="0"
                  {...register('currentStock', { valueAsNumber: true })}
                  disabled={isLoading}
                />
                {errors.currentStock?.message && (
                  <p className="text-sm text-red-500">{String(errors.currentStock.message)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="minStockLevel">Nivel Mínimo de Stock</Label>
                <Input
                  id="minStockLevel"
                  type="number"
                  placeholder="10"
                  {...register('minStockLevel', { valueAsNumber: true })}
                  disabled={isLoading}
                />
                {errors.minStockLevel?.message && (
                  <p className="text-sm text-red-500">{String(errors.minStockLevel.message)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxStockLevel">Nivel Máximo de Stock</Label>
                <Input
                  id="maxStockLevel"
                  type="number"
                  placeholder="Opcional"
                  {...register('maxStockLevel', { valueAsNumber: true })}
                  disabled={isLoading}
                />
                {errors.maxStockLevel?.message && (
                  <p className="text-sm text-red-500">{String(errors.maxStockLevel.message)}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unidad</Label>
              <Input
                id="unit"
                placeholder="ej., piezas, kg, litros"
                {...register('unit')}
                disabled={isLoading}
              />
              {errors.unit?.message && (
                <p className="text-sm text-red-500">{String(errors.unit.message)}</p>
              )}
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="trackExpirationDates"
                  checked={watch('trackExpirationDates')}
                  onCheckedChange={(checked) => setValue('trackExpirationDates', checked as boolean)}
                  disabled={isLoading}
                />
                <Label htmlFor="trackExpirationDates" className="cursor-pointer">
                  Rastrear fechas de vencimiento (productos perecederos)
                </Label>
              </div>
              <p className="text-xs text-gray-500">
                Habilita el seguimiento de lotes con fechas de vencimiento para productos como alimentos, medicinas o cosméticos.
              </p>
            </div>
          </CardContent>
        </Card>

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
            {mode === 'create' ? 'Crear Producto' : 'Actualizar Producto'}
          </Button>
        </div>
      </form>

      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodeDetected}
      />
    </>
  )
}
