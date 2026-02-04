'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Package, Star, ExternalLink, Upload, Download } from 'lucide-react'
import { ProductImportDialog } from './product-import-dialog'

interface SupplierProductsProps {
  supplierId: string
  initialProducts: any[]
  storeId: string
  storeSlug: string
}

export function SupplierProducts({
  supplierId,
  initialProducts,
  storeId,
  storeSlug,
}: SupplierProductsProps) {
  const [products] = useState(initialProducts)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const router = useRouter()

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date))
  }

  const handleExport = async () => {
    try {
      const response = await fetch(
        `/api/stores/${storeId}/suppliers/${supplierId}/products/export?format=csv`
      )

      if (!response.ok) {
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `productos-proveedor-${supplierId}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  const handleImportSuccess = () => {
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Productos del Proveedor</h3>
          <p className="text-sm text-muted-foreground">
            Lista de productos asociados a este proveedor
          </p>
        </div>
        <div className="flex gap-2">
          {products.length > 0 && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          )}
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Agregar Producto
          </Button>
        </div>
      </div>

      <ProductImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        storeId={storeId}
        supplierId={supplierId}
        onSuccess={handleImportSuccess}
      />

      {products.length === 0 ? (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="text-lg font-semibold mb-2">No hay productos</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Asocia productos de tu inventario con este proveedor
            </p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Producto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader>
            <CardTitle>Productos Asociados ({products.length})</CardTitle>
            <CardDescription>
              Productos que este proveedor puede suministrar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Producto</th>
                    <th className="text-left py-3 px-4 hidden md:table-cell">SKU Proveedor</th>
                    <th className="text-center py-3 px-4 hidden lg:table-cell">Última Compra</th>
                    <th className="text-right py-3 px-4 hidden sm:table-cell">Último Precio</th>
                    <th className="text-center py-3 px-4">Estado</th>
                    <th className="text-right py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((supplierProduct: any) => (
                    <tr key={supplierProduct.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {supplierProduct.isPreferred && (
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          )}
                          <div>
                            <p className="font-medium text-sm">
                              {supplierProduct.product?.name || 'Producto'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              SKU: {supplierProduct.product?.sku || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm hidden md:table-cell">
                        {supplierProduct.supplierSku || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-center hidden lg:table-cell">
                        {supplierProduct.lastPurchaseDate
                          ? formatDate(supplierProduct.lastPurchaseDate)
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-right hidden sm:table-cell">
                        {supplierProduct.lastPurchasePrice
                          ? formatCurrency(Number(supplierProduct.lastPurchasePrice))
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={supplierProduct.isActive ? 'default' : 'secondary'}>
                          {supplierProduct.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
