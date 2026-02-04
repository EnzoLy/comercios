'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Upload, Download, FileSpreadsheet, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react'

interface PriceImportDialogProps {
  isOpen: boolean
  onClose: () => void
  storeId: string
  supplierId: string
  onSuccess?: () => void
}

interface ImportPreview {
  sku: string
  price: string
  currency: string
  effectiveDate: string
}

interface ImportResult {
  total: number
  imported: number
  skipped: number
  errors: {
    row: number
    message: string
  }[]
}

export function PriceImportDialog({
  isOpen,
  onClose,
  storeId,
  supplierId,
  onSuccess,
}: PriceImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatCurrency = (amount: string, currency: string = 'USD') => {
    try {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency,
      }).format(parseFloat(amount))
    } catch {
      return amount
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Por favor selecciona un archivo CSV')
      return
    }

    setFile(selectedFile)
    setShowPreview(false)
    setResult(null)
    parsePreview(selectedFile)
  }

  const parsePreview = async (file: File) => {
    try {
      const text = await file.text()
      const lines = text.split('\n').filter((line) => line.trim())

      if (lines.length < 2) {
        toast.error('El archivo está vacío o no tiene datos')
        return
      }

      // Parse first 5 rows (excluding header)
      const previewData: ImportPreview[] = []
      for (let i = 1; i < Math.min(6, lines.length); i++) {
        const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
        previewData.push({
          sku: values[0] || '',
          price: values[1] || '',
          currency: values[2] || 'USD',
          effectiveDate: values[3] || new Date().toISOString().split('T')[0],
        })
      }

      setPreview(previewData)
      setShowPreview(true)
    } catch (error) {
      console.error('Preview parse error:', error)
      toast.error('Error al leer el archivo')
    }
  }

  const handleDownloadTemplate = () => {
    const today = new Date().toISOString().split('T')[0]
    const template = `sku,price,currency,effectiveDate
PROD-001,99.99,USD,${today}
PROD-002,149.50,USD,${today}
PROD-003,1250.00,MXN,${today}`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla-precios.csv'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const handleImport = async () => {
    if (!file) return

    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(
        `/api/stores/${storeId}/suppliers/${supplierId}/prices/import`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Error al importar precios')
        return
      }

      setResult(data)

      if (data.errors.length === 0) {
        toast.success(`${data.imported} precios importados exitosamente`)
        onSuccess?.()
        setTimeout(() => {
          handleClose()
        }, 2000)
      } else {
        toast.warning(
          `Importados ${data.imported} de ${data.total}. ${data.errors.length} errores.`
        )
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Ocurrió un error al importar. Por favor intenta de nuevo.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setPreview([])
    setShowPreview(false)
    setResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Precios</DialogTitle>
          <DialogDescription>
            Actualiza precios de productos de forma masiva
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-6">
          {/* Instructions */}
          {!result && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Instrucciones
              </h4>
              <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                <li>El archivo debe estar en formato CSV (valores separados por comas)</li>
                <li>La primera fila debe contener: sku, price, currency, effectiveDate</li>
                <li>El SKU debe coincidir con un producto existente asociado al proveedor</li>
                <li>El precio debe ser un número decimal (ej: 99.99)</li>
                <li>La moneda debe ser un código ISO (ej: USD, MXN, EUR)</li>
                <li>La fecha efectiva debe estar en formato YYYY-MM-DD</li>
              </ul>
              <Button
                variant="link"
                className="mt-2 p-0 h-auto"
                onClick={handleDownloadTemplate}
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar plantilla de ejemplo
              </Button>
            </div>
          )}

          {/* File Upload */}
          {!result && (
            <div className="space-y-2">
              <Label htmlFor="file">Archivo CSV</Label>
              <div className="flex gap-2">
                <Input
                  id="file"
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="flex-1"
                />
                {file && (
                  <Badge variant="outline" className="flex items-center gap-2">
                    <FileSpreadsheet className="h-3 w-3" />
                    {file.name}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Preview */}
          {showPreview && !result && preview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Vista Previa (primeras 5 filas)</h4>
                <Badge variant="secondary">{preview.length} filas mostradas</Badge>
              </div>

              <div className="border rounded-md overflow-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Moneda</TableHead>
                      <TableHead>Fecha Efectiva</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{row.sku}</TableCell>
                        <TableCell>{formatCurrency(row.price, row.currency)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{row.currency}</Badge>
                        </TableCell>
                        <TableCell>{row.effectiveDate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Total</div>
                  <div className="text-2xl font-bold">{result.total}</div>
                </div>
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Importados
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {result.imported}
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Errores
                  </div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {result.errors.length}
                  </div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Errores Encontrados</h4>
                  <div className="border rounded-md overflow-auto max-h-48">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">Fila</TableHead>
                          <TableHead>Mensaje</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.errors.map((error, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{error.row}</TableCell>
                            <TableCell className="text-sm text-red-600 dark:text-red-400">
                              {error.message}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            {result ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!result && (
            <Button
              onClick={handleImport}
              disabled={!file || !showPreview || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar Precios
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
