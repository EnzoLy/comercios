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

interface SupplierImportDialogProps {
  isOpen: boolean
  onClose: () => void
  storeId: string
  onSuccess?: () => void
}

interface ImportPreview {
  name: string
  taxId?: string
  city?: string
  isActive: string
  isPreferred: string
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

export function SupplierImportDialog({
  isOpen,
  onClose,
  storeId,
  onSuccess,
}: SupplierImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
          name: values[0] || '',
          taxId: values[1] || '',
          city: values[2] || '',
          isActive: values[3] || 'true',
          isPreferred: values[4] || 'false',
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
    const template = `name,taxId,email,phone,website,address,city,state,postalCode,country,isActive,isPreferred,rating,notes
Proveedor Ejemplo,RFC123456,proveedor@ejemplo.com,5555555555,https://ejemplo.com,Calle Principal 123,Ciudad de México,CDMX,12345,México,true,false,5,Notas opcionales sobre el proveedor`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla-proveedores.csv'
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

      const response = await fetch(`/api/stores/${storeId}/suppliers/import`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Error al importar proveedores')
        return
      }

      setResult(data)

      if (data.errors.length === 0) {
        toast.success(`${data.imported} proveedores importados exitosamente`)
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
          <DialogTitle>Importar Proveedores</DialogTitle>
          <DialogDescription>
            Importa múltiples proveedores desde un archivo CSV
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
                <li>La primera fila debe contener los nombres de las columnas</li>
                <li>Los campos requeridos son: name (nombre del proveedor)</li>
                <li>Los campos opcionales: taxId, email, phone, website, address, city, state, postalCode, country, isActive, isPreferred, rating, notes</li>
                <li>Los valores booleanos deben ser: true o false</li>
                <li>La calificación (rating) debe ser un número del 1 al 5</li>
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
                      <TableHead>Nombre</TableHead>
                      <TableHead>RFC/Tax ID</TableHead>
                      <TableHead>Ciudad</TableHead>
                      <TableHead>Activo</TableHead>
                      <TableHead>Preferido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{row.name || '-'}</TableCell>
                        <TableCell>{row.taxId || '-'}</TableCell>
                        <TableCell>{row.city || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={row.isActive === 'true' ? 'default' : 'secondary'}>
                            {row.isActive === 'true' ? 'Sí' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.isPreferred === 'true' ? 'default' : 'secondary'}>
                            {row.isPreferred === 'true' ? 'Sí' : 'No'}
                          </Badge>
                        </TableCell>
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
                  Importar Proveedores
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
