'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'
import { Loader2, Search, PackagePlus } from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string
  costPrice: number
  sellingPrice: number
  currentStock: number
  categoryId?: string
}

interface AddExistingProductDialogProps {
  isOpen: boolean
  onClose: () => void
  categoryId: string
  categoryName: string
  storeId: string
  onSuccess: () => void
}

export function AddExistingProductDialog({
  isOpen,
  onClose,
  categoryId,
  categoryName,
  storeId,
  onSuccess,
}: AddExistingProductDialogProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (isOpen && categoryId) {
      loadProducts()
    } else {
      // Reset state when dialog closes
      setProducts([])
      setSelectedProductIds(new Set())
      setSearchQuery('')
    }
  }, [isOpen, categoryId])

  const loadProducts = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/stores/${storeId}/products`)
      if (!response.ok) throw new Error('Failed to load products')

      const data = await response.json()
      // Extract products array from response object and filter products that are NOT in this category
      const allProducts = data.products || []
      const availableProducts = allProducts.filter((p: Product) => p.categoryId !== categoryId)
      setProducts(availableProducts)
    } catch (error) {
      toast.error('Error al cargar los productos')
      console.error('Load products error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const allVisibleSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedProductIds.has(p.id))
  const someVisibleSelected =
    filteredProducts.length > 0 &&
    filteredProducts.some((p) => selectedProductIds.has(p.id))

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const visibleProductIds = new Set(filteredProducts.map((p) => p.id))
      setSelectedProductIds((prev) => {
        const next = new Set(prev)
        visibleProductIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      const visibleProductIds = new Set(filteredProducts.map((p) => p.id))
      setSelectedProductIds((prev) => {
        const next = new Set(prev)
        visibleProductIds.forEach((id) => next.add(id))
        return next
      })
    }
  }

  const toggleSelectProduct = (productId: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

  const handleAddProducts = async () => {
    if (selectedProductIds.size === 0) {
      toast.error('Selecciona al menos un producto')
      return
    }

    setIsSubmitting(true)
    try {
      // Update each product to add them to this category
      const updatePromises = Array.from(selectedProductIds).map((productId) =>
        fetch(`/api/stores/${storeId}/products/${productId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoryId }),
        })
      )

      const results = await Promise.all(updatePromises)

      const failed = results.filter((r) => !r.ok)
      if (failed.length > 0) {
        toast.error(`Error al agregar ${failed.length} producto(s)`)
        return
      }

      toast.success(
        `${selectedProductIds.size} producto${selectedProductIds.size !== 1 ? 's' : ''} agregado${selectedProductIds.size !== 1 ? 's' : ''} a "${categoryName}"`
      )

      setSelectedProductIds(new Set())
      onSuccess()
      onClose()
    } catch (error) {
      toast.error('Error al agregar productos')
      console.error('Add products error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedCount = selectedProductIds.size

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-6xl !max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5" />
            Agregar Productos Existentes
          </DialogTitle>
          <DialogDescription>
            Selecciona productos para agregarlos a <strong>{categoryName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Search */}
          <div className="flex items-center gap-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre o SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Products Table */}
          <div className="flex-1 overflow-auto border rounded-md w-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <PackagePlus className="h-12 w-12 mb-2" />
                <p>
                  {searchQuery
                    ? 'No se encontraron productos'
                    : 'No hay productos disponibles para agregar'}
                </p>
                {products.length === 0 && !searchQuery && (
                  <p className="text-sm mt-2">
                    Todos los productos ya están en esta categoría
                  </p>
                )}
              </div>
            ) : (
              <Table className="w-full min-w-max">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">
                      <Checkbox
                        checked={allVisibleSelected}
                        data-state={someVisibleSelected ? 'indeterminate' : undefined}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Seleccionar todos"
                      />
                    </TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Precio Costo</TableHead>
                    <TableHead className="text-right">Precio Venta</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedProductIds.has(product.id)}
                          onCheckedChange={() => toggleSelectProduct(product.id)}
                          aria-label={`Seleccionar ${product.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-gray-600">{product.sku}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(product.costPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(product.sellingPrice)}
                      </TableCell>
                      <TableCell className="text-right">{product.currentStock}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedCount > 0 && (
              <span className="font-medium">{selectedCount}</span>
            )}{' '}
            {selectedCount === 1 ? 'producto' : 'productos'} seleccionado{selectedCount !== 1 ? 's' : ''}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddProducts}
              disabled={selectedCount === 0 || isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Agregar a Categoría
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
