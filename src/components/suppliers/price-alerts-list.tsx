'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { AlertTriangle, TrendingUp, Search, ArrowUpDown, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface PriceAlert {
  id: string
  productId: string
  productName: string
  productSku: string
  supplierId: string
  supplierName: string
  currentPrice: number
  previousPrice: number | null
  currency: string
  changePercentage: number | null
  effectiveDate: Date
  createdAt: Date
}

interface PriceAlertsListProps {
  storeId: string
  storeSlug: string
}

type SortField = 'date' | 'percentage' | 'product' | 'supplier'
type SortOrder = 'asc' | 'desc'

export function PriceAlertsList({ storeId, storeSlug }: PriceAlertsListProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch(
          `/api/stores/${storeId}/suppliers/analytics/price-alerts?limit=100`
        )
        if (response.ok) {
          const data = await response.json()
          setAlerts(data.alerts || [])
        }
      } catch (error) {
        console.error('Error fetching price alerts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [storeId])

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

  const getAlertSeverity = (changePercent: number | null): 'high' | 'medium' | 'low' => {
    if (!changePercent) return 'low'
    if (changePercent >= 10) return 'high'
    if (changePercent >= 5) return 'medium'
    return 'low'
  }

  const getAlertBadgeColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
      case 'medium':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
      case 'low':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
    }
  }

  const getSeverityLabel = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return 'Alto'
      case 'medium':
        return 'Medio'
      case 'low':
        return 'Bajo'
    }
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const filteredAndSortedAlerts = alerts
    .filter((alert) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        alert.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.productSku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.supplierName.toLowerCase().includes(searchQuery.toLowerCase())

      // Severity filter
      const severity = getAlertSeverity(alert.changePercentage)
      const matchesSeverity = filterSeverity === 'all' || severity === filterSeverity

      return matchesSearch && matchesSeverity
    })
    .sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'date':
          comparison = new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
          break
        case 'percentage':
          comparison = (a.changePercentage || 0) - (b.changePercentage || 0)
          break
        case 'product':
          comparison = a.productName.localeCompare(b.productName)
          break
        case 'supplier':
          comparison = a.supplierName.localeCompare(b.supplierName)
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card style={{ borderColor: 'var(--color-primary)' }}>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Producto, SKU o proveedor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Severity Filter */}
            <div>
              <Label htmlFor="severity-filter">Severidad</Label>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger id="severity-filter">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="high">Alta (&gt;10%)</SelectItem>
                  <SelectItem value="medium">Media (5-10%)</SelectItem>
                  <SelectItem value="low">Baja (&lt;5%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div>
              <Label htmlFor="sort-field">Ordenar por</Label>
              <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
                <SelectTrigger id="sort-field">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Fecha</SelectItem>
                  <SelectItem value="percentage">% Cambio</SelectItem>
                  <SelectItem value="product">Producto</SelectItem>
                  <SelectItem value="supplier">Proveedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredAndSortedAlerts.length} alerta(s) encontrada(s)
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              {sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card style={{ borderColor: 'var(--color-primary)' }}>
        <CardHeader>
          <CardTitle>Alertas de Precios</CardTitle>
          <CardDescription>Historial de cambios significativos en precios</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando alertas...</p>
            </div>
          ) : filteredAndSortedAlerts.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No se encontraron alertas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead className="text-right">Precio Anterior</TableHead>
                    <TableHead className="text-center"></TableHead>
                    <TableHead className="text-right">Precio Nuevo</TableHead>
                    <TableHead className="text-center">Cambio</TableHead>
                    <TableHead className="text-center">Severidad</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedAlerts.map((alert) => {
                    const severity = getAlertSeverity(alert.changePercentage)
                    return (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{alert.productName}</p>
                            <p className="text-xs text-muted-foreground">{alert.productSku}</p>
                          </div>
                        </TableCell>
                        <TableCell>{alert.supplierName}</TableCell>
                        <TableCell className="text-right">
                          {alert.previousPrice !== null ? (
                            <span className="text-muted-foreground">
                              {formatCurrency(alert.previousPrice, alert.currency)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-orange-600 dark:text-orange-400">
                            {formatCurrency(alert.currentPrice, alert.currency)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {alert.changePercentage !== null ? (
                            <span className="font-semibold">
                              +{alert.changePercentage.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className={getAlertBadgeColor(severity)}>
                            {getSeverityLabel(severity)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(alert.effectiveDate)}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/${storeSlug}/suppliers/${alert.supplierId}?tab=price-history`}
                          >
                            <Button variant="ghost" size="sm">
                              Ver Historial
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
