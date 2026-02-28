'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { Loader2, Package, Search, Plus, PackagePlus } from 'lucide-react'
import { BulkPriceAdjustmentDialog } from '@/components/products/bulk-price-adjustment-dialog'
import { AddExistingProductDialog } from '@/components/categories/add-existing-product-dialog'
import { useStore } from '@/hooks/use-store'
import { Product } from '@/types'

interface CategoryProductsDialogProps {
  isOpen: boolean
  onClose: () => void
  categoryId: string
  categoryName: string
  storeId: string
}

export function CategoryProductsDialog({
  isOpen,
  onClose,
  categoryId,
  categoryName,
  storeId,
}: CategoryProductsDialogProps) {
  const router = useRouter()
  const store = useStore()
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [priceAdjustmentOpen, setPriceAdjustmentOpen] = useState(false)
  const [addExistingOpen, setAddExistingOpen] = useState(false)

  const handleAddProduct = () => {
    if (!store) return
    router.push(`/dashboard/${store.slug}/products/new?categoryId=${categoryId}`)
    onClose()
  }

  const handleAdjustmentSuccess = () => {
    setPriceAdjustmentOpen(false)
    setSelectedProductIds(new Set())
    loadProducts()
  }

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
      const response = await fetch(
        `/api/stores/${storeId}/products?category=${categoryId}`
      )
      if (!response.ok) throw new Error('Failed to load products')

      const data = await response.json()
      // Extract products array from response object
      setProducts(data.products || [])
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

  const visibleProductIds = new Set(filteredProducts.map((p) => p.id))
  const allVisibleSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedProductIds.has(p.id))
  const someVisibleSelected =
    filteredProducts.length > 0 &&
    filteredProducts.some((p) => selectedProductIds.has(p.id))

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      // Deselect all visible
      setSelectedProductIds((prev) => {
        const next = new Set(prev)
        visibleProductIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      // Select all visible
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

  const selectedCount = selectedProductIds.size
  const selectedProducts = products.filter((p) => selectedProductIds.has(p.id))

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="!max-w-3xl !max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between p-2">
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Productos: {categoryName}
              </DialogTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAddExistingOpen(true)}
                  className="gap-2"
                >
                  <PackagePlus className="h-4 w-4" />
                  Agregar Existente
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddProduct}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo
                </Button>
              </div>
            </div>
            <DialogDescription>
              Ver y gestionar productos de esta categoría
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
            <div className="flex-1 overflow-auto border rounded-md w-full p-2">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <Package className="h-12 w-12 mb-2" />
                  <p>
                    {searchQuery
                      ? 'No se encontraron productos'
                      : 'No hay productos en esta categoría'}
                  </p>
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
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              <Button
                onClick={() => setPriceAdjustmentOpen(true)}
                disabled={selectedCount === 0}
              >
                Ajustar Precios
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkPriceAdjustmentDialog
        isOpen={priceAdjustmentOpen}
        onClose={() => setPriceAdjustmentOpen(false)}
        products={products}
        selectedProductIds={selectedProductIds}
        storeId={storeId}
        onSuccess={handleAdjustmentSuccess}
      />

      <AddExistingProductDialog
        isOpen={addExistingOpen}
        onClose={() => setAddExistingOpen(false)}
        categoryId={categoryId}
        categoryName={categoryName}
        storeId={storeId}
        onSuccess={loadProducts}
      />
    </>
  )
}
