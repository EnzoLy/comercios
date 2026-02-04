'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useStore } from '@/hooks/use-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingPage } from '@/components/ui/loading'
import { Plus, Package, AlertTriangle, Search, Filter, ChevronDown, ChevronLeft, ChevronRight, Trash2, RefreshCw } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

interface Product {
  id: string
  name: string
  sku: string
  barcode?: string
  sellingPrice: number
  costPrice: number
  currentStock: number
  minStockLevel: number
  maxStockLevel: number
  isActive: boolean
  trackStock: boolean
  imageUrl?: string
  category?: { id: string; name: string }
  supplier?: { id: string; name: string }
  barcodes?: Array<{ id: string; barcode: string; isPrimary: boolean }>
}

interface ProductsResponse {
  products: Product[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export default function ProductsPage() {
  const router = useRouter()
  const store = useStore()
  const searchParams = useSearchParams()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [pageLoading, setPageLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.get('category') || 'all')
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'createdAt'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  const [showFilters, setShowFilters] = useState(false)

  const searchDebounceRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Load categories
  useEffect(() => {
    if (!store) return

    const loadCategories = async () => {
      try {
        const response = await fetch(`/api/stores/${store.storeId}/categories`)
        if (response.ok) {
          const data = await response.json()

          // Flatten the category tree structure
          const flattenCategories = (cats: any[]): any[] => {
            const result: any[] = []
            cats.forEach((cat) => {
              result.push({ id: cat.id, name: cat.name })
              if (cat.children && cat.children.length > 0) {
                result.push(...flattenCategories(cat.children))
              }
            })
            return result
          }

          setCategories(flattenCategories(data))
        }
      } catch (error) {
        console.error('Error loading categories:', error)
      }
    }

    loadCategories()
  }, [store])

  // Load products
  const loadProducts = useCallback(async (pageNum: number = 1, isInitial: boolean = false) => {
    if (!store) return

    if (isInitial) {
      setLoading(true)
    } else {
      setPageLoading(true)
    }

    try {
      const params = new URLSearchParams()
      params.append('page', pageNum.toString())
      params.append('pageSize', pageSize.toString())
      if (search) params.append('search', search)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      if (stockFilter !== 'all') params.append('stock', stockFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      params.append('sortBy', sortBy)
      params.append('sortOrder', sortOrder)

      const response = await fetch(`/api/stores/${store.storeId}/products?${params}`)

      if (!response.ok) throw new Error('Failed to load products')

      const data: ProductsResponse = await response.json()

      setProducts(data.products)
      setTotal(data.total)
      setPage(pageNum)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      if (isInitial) {
        setLoading(false)
      } else {
        setPageLoading(false)
      }
    }
  }, [store, search, categoryFilter, stockFilter, statusFilter, sortBy, sortOrder, pageSize])

  // Initial load
  useEffect(() => {
    if (store) {
      loadProducts(1, true)
    }
  }, [store])

  // Debounced search
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }

    searchDebounceRef.current = setTimeout(() => {
      setPage(1)
      loadProducts(1, true)
    }, 500)

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
    }
  }, [search, categoryFilter, stockFilter, statusFilter, sortBy, sortOrder])

  // Reset page when pageSize changes
  useEffect(() => {
    setPage(1)
    loadProducts(1, true)
  }, [pageSize])

  const handleDelete = async () => {
    if (!deletingProduct || !store) return

    try {
      const response = await fetch(
        `/api/stores/${store.storeId}/products/${deletingProduct.id}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete product')
      }

      const result = await response.json()

      // Reload products to update the list
      loadProducts(page, true)

      if (result.preserved) {
        alert(`Producto desactivado (preservado en ${result.saleCount} ventas)`)
      } else {
        alert('Producto eliminado exitosamente')
      }

      setDeletingProduct(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al eliminar producto')
    }
  }

  const handleRefresh = () => {
    loadProducts(page, true)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    loadProducts(newPage, false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const totalPages = Math.ceil(total / pageSize)

  if (!store) {
    return <LoadingPage title="Cargando..." description="Obteniendo información de la tienda..." />
  }

  const lowStockCount = products.filter(p => p.currentStock <= p.minStockLevel).length

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Productos</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Administra tu catálogo de productos
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button asChild>
              <Link href={`/dashboard/${store.slug}/products/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Producto
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 text-sm text-gray-600 dark:text-gray-400">
          <span>Total: <strong className="text-gray-900 dark:text-gray-100">{total}</strong></span>
          {lowStockCount > 0 && (
            <span className="text-orange-600">
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              Stock bajo: <strong>{lowStockCount}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {showFilters ? (
                <ChevronDown className="h-4 w-4 ml-2" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-2 rotate-180" />
              )}
            </Button>

            {(search || categoryFilter !== 'all' || stockFilter !== 'all' || statusFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setCategoryFilter('all')
                  setStockFilter('all')
                  setStatusFilter('all')
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>

          <div className={`space-y-4 ${showFilters ? '' : 'hidden'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 a">
              {/* Search */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nombre, SKU o código de barras..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {/* Category */}
                <div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las categorías" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Stock */}
                <div>
                  <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as 'all' | 'low' | 'out')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todo el stock" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todo el stock</SelectItem>
                      <SelectItem value="low">Stock bajo</SelectItem>
                      <SelectItem value="out">Agotado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="active">Activos</SelectItem>
                      <SelectItem value="inactive">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </div>

            {/* Sort */}
            <div className="flex gap-2 flex-col align-start">
              <p>Ordenar por:</p>
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [sort, order] = value.split('-')
                setSortBy(sort as any)
                setSortOrder(order as any)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt-DESC">Más recientes</SelectItem>
                  <SelectItem value="createdAt-ASC">Más antiguos</SelectItem>
                  <SelectItem value="name-ASC">Nombre A-Z</SelectItem>
                  <SelectItem value="name-DESC">Nombre Z-A</SelectItem>
                  <SelectItem value="price-ASC">Precio: Menor a Mayor</SelectItem>
                  <SelectItem value="price-DESC">Precio: Mayor a Menor</SelectItem>
                  <SelectItem value="stock-ASC">Stock: Menor a Mayor</SelectItem>
                  <SelectItem value="stock-DESC">Stock: Mayor a Menor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <Card className="mb-6" style={{ borderColor: 'var(--color-secondary)', backgroundColor: 'rgba(var(--color-secondary), 0.05)' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: 'var(--color-secondary)' }}>
              <AlertTriangle className="h-5 w-5" />
              Alerta de Stock Bajo
            </CardTitle>
            <CardDescription style={{ color: 'var(--color-secondary)' }}>
              {lowStockCount} producto(s) bajo el nivel mínimo de stock
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Products Table */}
      {loading && products.length === 0 ? (
        <LoadingPage title="Cargando productos..." description="Obteniendo catálogo..." />
      ) : products.length === 0 ? (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No se encontraron productos</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {search || categoryFilter !== 'all' || stockFilter !== 'all' || statusFilter !== 'all'
                ? 'Prueba con otros filtros o limpia los filtros actuales'
                : 'Comienza agregando tu primer producto'}
            </p>
            {!search && categoryFilter === 'all' && stockFilter === 'all' && statusFilter === 'all' && (
              <Button asChild>
                <Link href={`/dashboard/${store.slug}/products/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Producto
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader>
            <CardTitle>
              {search || categoryFilter !== 'all' || stockFilter !== 'all' || statusFilter !== 'all'
                ? `Resultados (${total})`
                : `Todos los Productos (${total})`
              }
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Nombre</th>
                    <th className="text-left py-3 px-4 hidden md:table-cell">SKU</th>
                    <th className="text-left py-3 px-4 hidden lg:table-cell">Código de Barras</th>
                    <th className="text-right py-3 px-4">Precio</th>
                    <th className="text-right py-3 px-4">Stock</th>
                    <th className="text-center py-3 px-4 hidden sm:table-cell">Estado</th>
                    <th className="text-right py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => (
                    <tr key={`${product.id}-${index}`} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4">
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
                            <p className="font-medium">{product.name}</p>
                            {product.category && (
                              <p className="text-xs text-gray-500">
                                {product.category.name}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 md:hidden mt-1">
                              {product.sku}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <code className="text-sm">{product.sku}</code>
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        {product.barcode ? (
                          <code className="text-sm">{product.barcode}</code>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm">
                          ${Number(product.sellingPrice).toFixed(2)}
                        </span>
                        <p className="text-xs text-gray-500">
                          Costo: ${Number(product.costPrice).toFixed(2)}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span
                            className={
                              product.currentStock <= product.minStockLevel
                                ? 'text-orange-600 font-semibold'
                                : product.currentStock === 0
                                  ? 'text-red-600 font-semibold'
                                  : ''
                            }
                          >
                            {product.currentStock}
                          </span>
                          {product.currentStock <= product.minStockLevel && product.currentStock > 0 && (
                            <AlertTriangle className="h-3 w-3 text-orange-600" />
                          )}
                          {product.currentStock === 0 && (
                            <AlertTriangle className="h-3 w-3 text-red-600" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          Min: {product.minStockLevel}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center hidden sm:table-cell">
                        <Badge
                          variant={product.isActive ? 'default' : 'secondary'}
                          className="cursor-pointer"
                          onClick={() => {
                            setStatusFilter(product.isActive ? 'inactive' : 'active')
                            loadProducts(1, false)
                          }}
                        >
                          {product.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                            <Link href={`/dashboard/${store.slug}/products/${product.id}`}>
                              <span className="hidden sm:inline">Editar</span>
                              <span className="sm:hidden">✏️</span>
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-red-600 hover:text-red-700"
                            onClick={() => setDeletingProduct(product)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && products.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>Mostrando</span>
                  <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>por página</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} de {total}
                  </span>

                  <div className="flex items-center gap-1">
                    {pageLoading ? (
                      <div className="flex items-center gap-2 px-3">
                        <RefreshCw className="h-4 w-4 animate-spin text-gray-600" />
                        <span className="text-sm text-gray-600">Cargando...</span>
                      </div>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(page - 1)}
                          disabled={page === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        {/* Page numbers */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (page <= 3) {
                            pageNum = i + 1
                          } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = page - 2 + i
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={page === pageNum ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                              className="w-10"
                            >
                              {pageNum}
                            </Button>
                          )
                        })}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(page + 1)}
                          disabled={page === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deletingProduct}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Producto</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar &quot;{deletingProduct?.name}&quot;?
              {deletingProduct && (
                <span className="block mt-2 text-sm text-gray-600">
                  Este producto tiene <strong>{deletingProduct.currentStock}</strong> unidades en stock
                  {deletingProduct.currentStock <= deletingProduct.minStockLevel && (
                    <span className="block mt-1 text-orange-600">
                      ⚠️ Stock bajo activado
                    </span>
                  )}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
