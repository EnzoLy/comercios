'use client'

import { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExcelParseError } from '@/lib/import/excel-parser'

interface ImportPreviewProps {
  data: {
    products: Record<string, unknown>[]
    categories: Record<string, unknown>[]
    suppliers: Record<string, unknown>[]
  }
  errors: {
    productErrors: ExcelParseError[]
    categoryErrors: ExcelParseError[]
    supplierErrors: ExcelParseError[]
  }
  activeTab: 'products' | 'categories' | 'suppliers'
}

export function ImportPreview({ data, errors, activeTab }: ImportPreviewProps) {
  const currentData = data[activeTab]
  const currentErrors = errors[
    activeTab === 'products'
      ? 'productErrors'
      : activeTab === 'categories'
      ? 'categoryErrors'
      : 'supplierErrors'
  ]

  const columns = useMemo(() => {
    if (currentData.length === 0) return []
    const allKeys = new Set<string>()
    currentData.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (!key.startsWith('extra_')) {
          allKeys.add(key)
        }
      })
    })
    return Array.from(allKeys)
  }, [currentData])

  const errorMap = useMemo(() => {
    const map = new Map<number, Map<string, ExcelParseError>>()
    currentErrors.forEach((error) => {
      if (!map.has(error.row)) {
        map.set(error.row, new Map())
      }
      map.get(error.row)!.set(error.column, error)
    })
    return map
  }, [currentErrors])

  const errorCount = currentErrors.length
  const errorRows = new Set(currentErrors.map((e) => e.row))

  if (currentData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay datos de {activeTab === 'products' ? 'productos' : activeTab === 'categories' ? 'categorías' : 'proveedores'} para previsualizar
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Badge variant="outline" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {currentData.length} filas
        </Badge>
        {errorCount > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {errorCount} errores
          </Badge>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="w-12 bg-background">#</TableHead>
                {columns.map((col) => (
                  <TableHead key={col} className="bg-background whitespace-nowrap">
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.map((row, idx) => {
                const rowNum = idx + 2
                const hasError = errorRows.has(rowNum)
                const rowErrors = errorMap.get(rowNum)

                return (
                  <TableRow
                    key={idx}
                    className={cn(hasError && 'bg-red-50 dark:bg-red-950/20')}
                  >
                    <TableCell className="font-mono text-xs">
                      {rowNum}
                    </TableCell>
                    {columns.map((col) => {
                      const error = rowErrors?.get(col)
                      const value = row[col]
                      return (
                        <TableCell
                          key={col}
                          className={cn(
                            'whitespace-nowrap',
                            error && 'bg-red-100 dark:bg-red-900/30'
                          )}
                          title={error?.message}
                        >
                          <div className="flex items-center gap-1">
                            {error && (
                              <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                            )}
                            <span className="truncate max-w-[150px]">
                              {value !== undefined && value !== null
                                ? String(value)
                                : '-'}
                            </span>
                          </div>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {errorCount > 0 && (
        <div className="text-sm text-muted-foreground">
          Las filas con errores se resaltan en rojo. Pasa el cursor sobre una celda para ver el mensaje de error.
        </div>
      )}
    </div>
  )
}
