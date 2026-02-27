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
import { Plus, Package, AlertTriangle, Search, Filter, ChevronDown, ChevronLeft, ChevronRight, Trash2, RefreshCw, Calendar, Box, ShoppingCart, DollarSign, Pencil, FileSpreadsheet } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { BulkExpirationToggleDialog } from '@/components/products/bulk-expiration-toggle-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

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
  trackExpirationDates?: boolean
  imageUrl?: string
  category?: { id: string; name: string }
  supplier?: { id: string; name: string }
  barcodes?: Array<{ id: string; barcode: string; isPrimary: boolean }>
  expirationStatus?: {
    hasExpired: boolean
    hasExpiringSoon: boolean
    nearestExpirationDays: number
    nearestExpirationDate: string
  }
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
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [bulkExpirationDialogOpen, setBulkExpirationDialogOpen] = useState(false)

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

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(products.map((p) => p.id))
    }
  }

  const clearSelection = () => {
    setSelectedProducts([])
    setBulkExpirationDialogOpen(false)
  }

  const totalPages = Math.ceil(total / pageSize)

  if (!store) {
    return <LoadingPage title="Cargando..." description="Obteniendo información de la tienda..." />
  }

  const lowStockCount = products.filter(p => p.currentStock <= p.minStockLevel).length

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">
            Gestión de <span className="gradient-text">Inventario</span>
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Administra y monitorea tu catálogo completo de productos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {selectedProducts.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setBulkExpirationDialogOpen(true)}
              className="h-11 rounded-2xl border-primary/20 hover:bg-primary/5 bg-background/50 backdrop-blur-sm shadow-sm"
            >
              <Calendar className="mr-2 h-4 w-4 text-primary" />
              Lotes/Vencimientos ({selectedProducts.length})
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={handleRefresh}
            size="icon"
            className="h-11 w-11 rounded-2xl bg-background/50 backdrop-blur-sm border border-border shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button asChild className="h-11 rounded-2xl px-6 shadow-lg shadow-primary/20">
            <Link href={`/dashboard/${store.slug}/products/new`}>
              <Plus className="mr-2 h-5 w-5" />
              Nuevo Producto
            </Link>
          </Button>

        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="group relative overflow-hidden border bg-card text-foreground shadow-lg shadow-indigo-500/10 transition-all hover:bg-card/90">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
            <Package className="h-24 w-24" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider opacity-60">Total Productos</CardTitle>
            <Box className="h-4 w-4 opacity-60" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black">{total}</div>
            <p className="text-xs opacity-60 mt-2 font-medium">Items registrados en catálogo</p>
          </CardContent>
        </Card>

        <Card className={`group relative overflow-hidden border-none shadow-lg transition-all ${lowStockCount > 0 ? "bg-orange-600 shadow-orange-500/20" : "bg-emerald-600 shadow-emerald-500/20"}`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <AlertTriangle className="h-24 w-24" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 text-white/80">
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Alertas de Stock</CardTitle>
            <AlertTriangle className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-white">{lowStockCount}</div>
            <p className="text-xs text-white/60 mt-2 font-medium">Bajo el nivel mínimo sugerido</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-none bg-indigo-600 shadow-lg shadow-indigo-500/20">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <ShoppingCart className="h-24 w-24" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 text-white/80">
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Valor Inventario</CardTitle>
            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-white">
              <span className="text-lg opacity-60 mr-1">$</span>
              {products.reduce((sum, p) => sum + (p.costPrice * p.currentStock), 0).toLocaleString('es-ES', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-white/60 mt-2 font-medium">Basado en costo y stock actual</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-8 border-none bg-card shadow-xl shadow-slate-950/5 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Filter className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Filtros de Búsqueda</h3>
            </div>

            <div className="flex items-center gap-2">
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
                  className="text-muted-foreground hover:text-destructive h-9 rounded-xl font-bold"
                >
                  Limpiar Filtros
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="h-9 rounded-xl border-primary/20 hover:bg-primary/5 font-bold"
              >
                {showFilters ? 'Ocultar Avanzado' : 'Filtros Avanzados'}
                <ChevronDown className={`h-4 w-4 ml-2 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Primary Search */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Buscar por nombre, SKU o código de barras..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 h-14 text-lg border-border bg-secondary/30 rounded-2xl focus-visible:ring-primary/20 placeholder:text-muted-foreground/50 transition-all shadow-inner"
              />
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-300 ${showFilters ? '' : 'hidden'}`}>
              {/* Category */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Categoría</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-11 rounded-xl bg-background/50 border-border">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border shadow-2xl">
                    <SelectItem key="all-categories" value="all">Todas las categorías</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stock */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Estado Stock</label>
                <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as 'all' | 'low' | 'out')}>
                  <SelectTrigger className="h-11 rounded-xl bg-background/50 border-border">
                    <SelectValue placeholder="Todo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border shadow-2xl">
                    <SelectItem value="all">Todo el stock</SelectItem>
                    <SelectItem value="low">Stock bajo</SelectItem>
                    <SelectItem value="out">Agotado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Estado Artículo</label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive')}>
                  <SelectTrigger className="h-11 rounded-xl bg-background/50 border-border">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border shadow-2xl">
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="active">Activos únicamente</SelectItem>
                    <SelectItem value="inactive">Inactivos únicamente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Ordenar Por</label>
                <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                  const [sort, order] = value.split('-')
                  setSortBy(sort as any)
                  setSortOrder(order as any)
                }}>
                  <SelectTrigger className="h-11 rounded-xl bg-background/50 border-border">
                    <SelectValue placeholder="Ordenar por..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border shadow-2xl">
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
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      {loading && products.length === 0 ? (
        <LoadingPage title="Cargando productos..." description="Obteniendo catálogo..." />
      ) : products.length === 0 ? (
        <Card className="border-none bg-card shadow-xl shadow-slate-950/5 overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No se encontraron productos</h3>
            <p className="text-muted-foreground mb-4">
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
        <Card className="border-none bg-card shadow-xl shadow-slate-950/5 overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/30 px-6 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold">
                {search || categoryFilter !== 'all' || stockFilter !== 'all' || statusFilter !== 'all'
                  ? `Resultados de Búsqueda (${total})`
                  : `Catálogo Completo (${total})`
                }
              </CardTitle>
              {selectedProducts.length > 0 && (
                <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                  <Badge variant="secondary" className="h-7 px-3 rounded-full bg-primary/10 text-primary border-primary/20 font-bold">
                    {selectedProducts.length} seleccionados
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedProducts([])} className="h-7 text-xs font-bold hover:text-destructive">
                    Deselccionar
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="py-4 px-6 text-center w-12">
                      <Checkbox
                        checked={selectedProducts.length === products.length && products.length > 0}
                        onCheckedChange={toggleSelectAll}
                        className="rounded-md border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </th>
                    <th className="text-left py-4 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Producto / Detalles</th>
                    <th className="text-left py-4 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hidden md:table-cell">Identificación</th>
                    <th className="text-right py-4 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Valorización</th>
                    <th className="text-right py-4 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Inventario</th>
                    <th className="text-center py-4 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hidden sm:table-cell">Status</th>
                    <th className="text-right py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {products.map((product, index) => (
                    <tr key={`${product.id}-${index}`} className="group transition-colors hover:bg-primary/5">
                      <td className="py-4 px-6 text-center">
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={() => toggleProductSelection(product.id)}
                          className="rounded-md border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-4">
                          <div className="relative h-14 w-14 flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-full w-full object-cover rounded-2xl shadow-sm border border-border bg-background"
                              />
                            ) : (
                              <div className="h-full w-full bg-muted rounded-2xl flex items-center justify-center border border-border">
                                <Package className="h-7 w-7 text-muted-foreground/30" />
                              </div>
                            )}
                            {product.currentStock <= product.minStockLevel && (
                              <div className="absolute -top-1 -right-1 h-4 w-4 bg-orange-500 rounded-full border-2 border-background shadow-sm animate-pulse" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-base leading-tight group-hover:text-primary transition-colors truncate">
                              {product.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {product.category && (
                                <span className="text-[10px] font-bold text-muted-foreground/80 border border-border px-1.5 py-0.5 rounded-md bg-secondary/50 uppercase tracking-tighter">
                                  {product.category.name}
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-muted-foreground/60"># {product.sku}</span>
                            </div>

                            <div className="flex gap-1 mt-2 flex-wrap">
                              {product.trackExpirationDates && (
                                <Badge variant="secondary" className="text-[9px] h-4 font-bold bg-blue-500/10 text-blue-600 border-blue-500/20 uppercase tracking-tighter">
                                  🗓️ Lotes
                                </Badge>
                              )}
                              {product.expirationStatus?.hasExpired && (
                                <Badge variant="destructive" className="text-[9px] h-4 font-bold uppercase tracking-tighter">
                                  ⚠️ Vencido
                                </Badge>
                              )}
                              {product.expirationStatus?.hasExpiringSoon && !product.expirationStatus?.hasExpired && (
                                <Badge className="text-[9px] h-4 font-bold bg-amber-500 hover:bg-amber-600 text-white uppercase tracking-tighter">
                                  ⏰ Por Vencer
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 hidden md:table-cell">
                        <div className="space-y-1">
                          <code className="text-[11px] font-mono bg-muted/50 px-2 py-0.5 rounded-lg border border-border">SKU: {product.sku}</code>
                          {product.barcode && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Search className="h-3 w-3 opacity-30" />
                              <code className="text-[10px] font-mono">{product.barcode}</code>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="font-black text-lg gradient-text leading-none">
                          ${Number(product.sellingPrice).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground/80 mt-1.5 uppercase tracking-widest">
                          Costo: ${Number(product.costPrice).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="inline-flex flex-col items-end">
                          <div className={`flex items-center gap-2 px-3 py-1 rounded-xl text-lg font-black border-2 ${product.currentStock <= 0
                            ? 'bg-destructive/10 text-destructive border-destructive/20'
                            : product.currentStock <= product.minStockLevel
                              ? 'bg-orange-500/10 text-orange-600 border-orange-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            }`}>
                            {product.currentStock}
                            {product.currentStock <= product.minStockLevel && (
                              <AlertTriangle className={`h-4 w-4 ${product.currentStock <= 0 ? 'text-destructive' : 'text-orange-600'}`} />
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-muted-foreground/80 mt-1.5 uppercase tracking-widest pr-1">
                            Mín: {product.minStockLevel}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center hidden sm:table-cell">
                        <button
                          onClick={() => {
                            // En un sistema real esto llamaría a una API de toggle
                            toast.info(`Cambiando estado de ${product.name}...`)
                          }}
                          className={`h-7 px-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${product.isActive
                            ? 'bg-primary/10 text-primary hover:bg-primary/20 hover:scale-105'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:scale-105'
                            }`}
                        >
                          {product.isActive ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all active:scale-95 shadow-sm border border-border/20">
                            <Link href={`/dashboard/${store.slug}/products/${product.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all active:scale-95 shadow-sm border border-border/20"
                            onClick={() => setDeletingProduct(product)}
                          >
                            <Trash2 className="h-5 w-5" />
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-t border-border bg-muted/20">
                <div className="flex items-center gap-3 text-sm font-bold text-muted-foreground">
                  <span>Mostrar</span>
                  <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
                    <SelectTrigger className="w-20 h-9 rounded-xl bg-background/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border shadow-2xl">
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="uppercase tracking-widest text-[10px]">por página</span>
                </div>

                <div className="flex items-center gap-6">
                  <span className="text-sm font-bold text-muted-foreground whitespace-nowrap">
                    {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} <span className="mx-1 opacity-30">/</span> {total}
                  </span>

                  <div className="flex items-center gap-2">
                    {pageLoading ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-xl border border-primary/20">
                        <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-xs font-bold text-primary uppercase tracking-widest">Cargando...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 bg-background/50 p-1 rounded-2xl border border-border">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePageChange(page - 1)}
                          disabled={page === 1}
                          className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </Button>

                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum
                          if (totalPages <= 5) pageNum = i + 1
                          else if (page <= 3) pageNum = i + 1
                          else if (page >= totalPages - 2) pageNum = totalPages - 4 + i
                          else pageNum = page - 2 + i

                          return (
                            <Button
                              key={pageNum}
                              variant={page === pageNum ? 'default' : 'ghost'}
                              size="icon"
                              onClick={() => handlePageChange(pageNum)}
                              className={`h-9 w-9 rounded-xl text-xs font-bold transition-all ${page === pageNum
                                ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-110'
                                : 'hover:bg-primary/10 hover:text-primary'
                                }`}
                            >
                              {pageNum}
                            </Button>
                          )
                        })}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePageChange(page + 1)}
                          disabled={page === totalPages}
                          className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                      </div>
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
        <AlertDialogContent className="rounded-3xl border-border shadow-2xl p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black">Eliminar Producto</AlertDialogTitle>
            <AlertDialogDescription className="text-base mt-2">
              ¿Estás seguro de que deseas eliminar <span className="font-bold text-foreground">"{deletingProduct?.name}"</span>?
              {deletingProduct && (
                <div className="mt-6 p-4 bg-muted/50 rounded-2xl border border-border">
                  <p className="text-sm font-medium">Este producto tiene <span className="font-bold text-foreground">{deletingProduct.currentStock}</span> unidades en stock.</p>
                  {deletingProduct.currentStock <= deletingProduct.minStockLevel && (
                    <p className="flex items-center gap-2 mt-2 text-sm text-orange-600 font-bold">
                      <AlertTriangle className="h-4 w-4" />
                      Advertencia: El stock está bajo.
                    </p>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 rounded-2xl font-bold border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="h-12 rounded-2xl font-bold bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/20"
            >
              Eliminar Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Expiration Toggle Dialog */}
      <BulkExpirationToggleDialog
        isOpen={bulkExpirationDialogOpen}
        onClose={clearSelection}
        selectedProductIds={selectedProducts}
        selectedProducts={products
          .filter((p) => selectedProducts.includes(p.id))
          .map((p) => ({
            id: p.id,
            name: p.name,
            currentStock: p.currentStock,
          }))}
      />
    </div>
  )
}
