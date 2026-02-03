'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ExportButtonProps {
  data: any[]
  filename: string
  disabled?: boolean
}

export function ExportButton({ data, filename, disabled = false }: ExportButtonProps) {
  const exportCSV = () => {
    if (!data || data.length === 0) {
      toast.error('Sin datos para exportar')
      return
    }

    try {
      // Get headers from first object
      const headers = Object.keys(data[0])

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...data.map((row) =>
          headers
            .map((header) => {
              const value = row[header]
              // Escape quotes and wrap in quotes if contains comma or newline
              if (value === null || value === undefined) return ''
              const stringValue = String(value)
              if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`
              }
              return stringValue
            })
            .join(',')
        ),
      ].join('\n')

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      link.setAttribute('href', url)
      link.setAttribute('download', `${filename}.csv`)
      link.style.visibility = 'hidden'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Datos exportados correctamente')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('No se pudo exportar los datos')
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportCSV}
      disabled={disabled || !data || data.length === 0}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Exportar CSV
    </Button>
  )
}
