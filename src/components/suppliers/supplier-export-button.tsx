'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react'

interface SupplierExportButtonProps {
  storeId: string
}

export function SupplierExportButton({ storeId }: SupplierExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setIsExporting(true)
    try {
      const response = await fetch(
        `/api/stores/${storeId}/suppliers/export?format=${format}`
      )

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || 'Error al exportar proveedores')
        return
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `proveedores-${new Date().toISOString().split('T')[0]}.${format}`

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Proveedores exportados exitosamente')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Ocurrió un error al exportar. Por favor intenta de nuevo.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Exportar a CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('xlsx')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Exportar a Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
