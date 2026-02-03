import Link from 'next/link'
import { getStoreContext } from '@/lib/auth/store-context'
import { getDataSource } from '@/lib/db'
import { Product } from '@/lib/db/entities/product.entity'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Package, AlertTriangle } from 'lucide-react'

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>
}) {
  const { storeSlug } = await params
  const context = await getStoreContext(storeSlug)

  if (!context) {
    return null
  }

  const dataSource = await getDataSource()
  const productRepo = dataSource.getRepository(Product)

  const products = await productRepo.find({
    where: { storeId: context.storeId },
    relations: ['category', 'supplier'],
    order: { createdAt: 'DESC' },
  })

  const lowStockProducts = products.filter(
    (p) => p.currentStock <= p.minStockLevel
  )

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Productos</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Administra tu catálogo de productos
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href={`/dashboard/${storeSlug}/products/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar Producto
          </Link>
        </Button>
      </div>

      {lowStockProducts.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
              <AlertTriangle className="h-5 w-5" />
              Alerta de Stock Bajo
            </CardTitle>
            <CardDescription className="text-orange-700 dark:text-orange-300">
              {lowStockProducts.length} producto(s) bajo el nivel mínimo de stock
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aún no hay productos</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Comienza agregando tu primer producto
            </p>
            <Button asChild>
              <Link href={`/dashboard/${storeSlug}/products/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Producto
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Todos los Productos ({products.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 sm:px-4">Nombre</th>
                    <th className="text-left py-3 px-2 sm:px-4 hidden md:table-cell">SKU</th>
                    <th className="text-left py-3 px-2 sm:px-4 hidden lg:table-cell">Código de Barras</th>
                    <th className="text-right py-3 px-2 sm:px-4">Precio</th>
                    <th className="text-right py-3 px-2 sm:px-4">Stock</th>
                    <th className="text-center py-3 px-2 sm:px-4 hidden sm:table-cell">Estado</th>
                    <th className="text-right py-3 px-2 sm:px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-2 sm:px-4">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-10 h-10 object-cover rounded flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                              <Package className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm sm:text-base">{product.name}</p>
                            {product.category && (
                              <p className="text-xs sm:text-sm text-gray-500">
                                {product.category.name}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 md:hidden mt-1">
                              {product.sku}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 sm:px-4 hidden md:table-cell">
                        <code className="text-sm">{product.sku}</code>
                      </td>
                      <td className="py-3 px-2 sm:px-4 hidden lg:table-cell">
                        {product.barcode ? (
                          <code className="text-sm">{product.barcode}</code>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-right">
                        <span className="text-sm sm:text-base">
                          ${Number(product.sellingPrice).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <span
                            className={
                              product.currentStock <= product.minStockLevel
                                ? 'text-orange-600 font-semibold text-sm sm:text-base'
                                : 'text-sm sm:text-base'
                            }
                          >
                            {product.currentStock}
                          </span>
                          {product.currentStock <= product.minStockLevel && (
                            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-center hidden sm:table-cell">
                        <Badge
                          variant={product.isActive ? 'default' : 'secondary'}
                        >
                          {product.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-right">
                        <Button asChild variant="ghost" size="sm" className="h-8 px-2 sm:px-3">
                          <Link href={`/dashboard/${storeSlug}/products/${product.id}`}>
                            <span className="hidden sm:inline">Editar</span>
                            <span className="sm:hidden">•••</span>
                          </Link>
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
