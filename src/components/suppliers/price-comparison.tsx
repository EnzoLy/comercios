'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Download, Search, TrendingDown, Calculator, AlertCircle } from 'lucide-react'
import type { Supplier } from '@/lib/db/entities/supplier.entity'
import type { Category } from '@/lib/db/entities/category.entity'

interface PriceComparisonProps {
  storeId: string
  storeSlug: string
  suppliers: Supplier[]
  categories: Category[]
}

interface ProductPrice {
  supplierId: string
  supplierName: string
  price: number
  currency: string
  sku?: string
  minimumOrderQuantity?: number
  packSize?: number
  isBest: boolean
  priceDifference?: number
  priceDifferencePercent?: number
}

interface ProductComparison {
  productId: string
  productName: string
  sku: string
  prices: ProductPrice[]
}

interface TotalCalculatorItem {
  productId: string
  quantity: number
}

export function PriceComparison({
  storeId,
  storeSlug,
  suppliers,
  categories,
}: PriceComparisonProps) {
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [comparisonData, setComparisonData] = useState<ProductComparison[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [showCalculator, setShowCalculator] = useState(false)

  const handleSupplierToggle = (supplierId: string) => {
    setSelectedSuppliers((prev) =>
      prev.includes(supplierId)
        ? prev.filter((id) => id !== supplierId)
        : [...prev, supplierId]
    )
  }

  const fetchComparison = async () => {
    if (selectedSuppliers.length < 2) {
      setError('Selecciona al menos 2 proveedores para comparar')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.append('supplierIds', selectedSuppliers.join(','))
      if (selectedCategory !== 'all') {
        params.append('categoryId', selectedCategory)
      }

      const response = await fetch(
        `/api/stores/${storeId}/suppliers/analytics/price-comparison?${params}`
      )

      if (!response.ok) {
        throw new Error('Error al obtener la comparación de precios')
      }

      const data = await response.json()
      setComparisonData(data.products || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedSuppliers.length >= 2) {
      fetchComparison()
    } else {
      setComparisonData([])
    }
  }, [selectedSuppliers, selectedCategory])

  const filteredData = comparisonData.filter(
    (product) =>
      searchQuery === '' ||
      product.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const exportToCSV = () => {
    if (comparisonData.length === 0) return

    // Build CSV header
    const headers = ['Producto', 'SKU', ...selectedSuppliers.map(id => {
      const supplier = suppliers.find(s => s.id === id)
      return supplier?.name || id
    })]

    // Build CSV rows
    const rows = comparisonData.map((product) => {
      const row = [product.productName, product.sku]

      selectedSuppliers.forEach(supplierId => {
        const priceData = product.prices.find(p => p.supplierId === supplierId)
        if (priceData) {
          row.push(`$${priceData.price.toFixed(2)}`)
        } else {
          row.push('N/A')
        }
      })

      return row
    })

    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `price-comparison-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const handleQuantityChange = (productId: string, value: string) => {
    const quantity = parseInt(value) || 0
    setQuantities((prev) => ({
      ...prev,
      [productId]: quantity,
    }))
  }

  const calculateSupplierTotals = () => {
    const totals: Record<string, number> = {}

    selectedSuppliers.forEach((supplierId) => {
      let total = 0

      comparisonData.forEach((product) => {
        const quantity = quantities[product.productId] || 0
        if (quantity > 0) {
          const priceData = product.prices.find((p) => p.supplierId === supplierId)
          if (priceData) {
            total += priceData.price * quantity
          }
        }
      })

      totals[supplierId] = total
    })

    return totals
  }

  const supplierTotals = showCalculator ? calculateSupplierTotals() : {}
  const lowestTotal = showCalculator
    ? Math.min(...Object.values(supplierTotals).filter((t) => t > 0))
    : 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Supplier Selection */}
      <Card style={{ borderColor: 'var(--color-primary)' }}>
        <CardHeader>
          <CardTitle>Seleccionar Proveedores</CardTitle>
          <CardDescription>
            Selecciona al menos 2 proveedores para comparar sus precios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`supplier-${supplier.id}`}
                  checked={selectedSuppliers.includes(supplier.id)}
                  onCheckedChange={() => handleSupplierToggle(supplier.id)}
                />
                <Label
                  htmlFor={`supplier-${supplier.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {supplier.name}
                  {supplier.isPreferred && (
                    <Badge variant="secondary" className="ml-2">
                      Preferido
                    </Badge>
                  )}
                </Label>
              </div>
            ))}
          </div>

          {selectedSuppliers.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {selectedSuppliers.length} proveedor(es) seleccionado(s)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters and Actions */}
      {selectedSuppliers.length >= 2 && (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <Label htmlFor="category-filter">Categoría</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger id="category-filter">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div>
                <Label htmlFor="product-search">Buscar Producto</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="product-search"
                    placeholder="Nombre o SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-end gap-2">
                <Button
                  onClick={() => setShowCalculator(!showCalculator)}
                  variant="outline"
                  className="flex-1"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  {showCalculator ? 'Ocultar' : 'Calcular'} Total
                </Button>
                <Button
                  onClick={exportToCSV}
                  variant="outline"
                  disabled={comparisonData.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Table */}
      {selectedSuppliers.length >= 2 && !loading && filteredData.length > 0 && (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader>
            <CardTitle>Comparación de Precios</CardTitle>
            <CardDescription>
              {filteredData.length} producto(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>SKU</TableHead>
                    {showCalculator && <TableHead>Cantidad</TableHead>}
                    {selectedSuppliers.map((supplierId) => {
                      const supplier = suppliers.find((s) => s.id === supplierId)
                      return (
                        <TableHead key={supplierId} className="text-center">
                          {supplier?.name || 'Unknown'}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((product) => (
                    <TableRow key={product.productId}>
                      <TableCell className="font-medium">{product.productName}</TableCell>
                      <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                      {showCalculator && (
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={quantities[product.productId] || ''}
                            onChange={(e) =>
                              handleQuantityChange(product.productId, e.target.value)
                            }
                            className="w-20"
                            placeholder="0"
                          />
                        </TableCell>
                      )}
                      {selectedSuppliers.map((supplierId) => {
                        const priceData = product.prices.find(
                          (p) => p.supplierId === supplierId
                        )

                        if (!priceData) {
                          return (
                            <TableCell key={supplierId} className="text-center text-muted-foreground">
                              N/A
                            </TableCell>
                          )
                        }

                        return (
                          <TableCell key={supplierId} className="text-center">
                            <div className="space-y-1">
                              <div
                                className={`font-semibold ${
                                  priceData.isBest
                                    ? 'text-green-600 dark:text-green-400'
                                    : ''
                                }`}
                              >
                                {formatCurrency(priceData.price)}
                                {priceData.isBest && (
                                  <Badge
                                    variant="secondary"
                                    className="ml-2 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                  >
                                    <TrendingDown className="h-3 w-3 mr-1" />
                                    Mejor
                                  </Badge>
                                )}
                              </div>
                              {!priceData.isBest && priceData.priceDifference && (
                                <div className="text-xs text-muted-foreground">
                                  +{formatCurrency(priceData.priceDifference)} (+
                                  {priceData.priceDifferencePercent}%)
                                </div>
                              )}
                              {priceData.minimumOrderQuantity && (
                                <div className="text-xs text-muted-foreground">
                                  Min: {priceData.minimumOrderQuantity}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total Calculator Panel */}
      {showCalculator && selectedSuppliers.length >= 2 && filteredData.length > 0 && (
        <Card style={{ borderColor: 'var(--color-secondary)' }}>
          <CardHeader>
            <CardTitle>Calculadora de Totales</CardTitle>
            <CardDescription>
              Compara el costo total según las cantidades ingresadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {selectedSuppliers.map((supplierId) => {
                const supplier = suppliers.find((s) => s.id === supplierId)
                const total = supplierTotals[supplierId] || 0
                const isBest = total > 0 && total === lowestTotal

                return (
                  <Card
                    key={supplierId}
                    className={
                      isBest
                        ? 'border-green-500 dark:border-green-600'
                        : 'border-gray-200 dark:border-gray-700'
                    }
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{supplier?.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className={`text-2xl font-bold ${
                          isBest ? 'text-green-600 dark:text-green-400' : ''
                        }`}
                      >
                        {formatCurrency(total)}
                      </div>
                      {isBest && total > 0 && (
                        <Badge
                          variant="secondary"
                          className="mt-2 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        >
                          <TrendingDown className="h-3 w-3 mr-1" />
                          Mejor Precio Total
                        </Badge>
                      )}
                      {!isBest && total > 0 && lowestTotal > 0 && (
                        <div className="text-sm text-muted-foreground mt-2">
                          +{formatCurrency(total - lowestTotal)} más caro
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando comparación...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty States */}
      {selectedSuppliers.length < 2 && !loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                Selecciona al menos 2 proveedores para comenzar la comparación
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedSuppliers.length >= 2 && !loading && filteredData.length === 0 && !error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                No se encontraron productos con precios de los proveedores seleccionados
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
