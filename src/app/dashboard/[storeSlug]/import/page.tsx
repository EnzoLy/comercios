'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ExcelUploader } from '@/components/import/excel-uploader'
import { ImportPreview } from '@/components/import/import-preview'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Download,
  FileSpreadsheet,
  Package,
  FolderTree,
  Truck,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import type { ExcelParseError } from '@/lib/import/excel-parser'
import { toast } from 'sonner'

interface PreviewData {
  products: Record<string, unknown>[]
  categories: Record<string, unknown>[]
  suppliers: Record<string, unknown>[]
}

interface ImportResult {
  success: boolean
  result?: {
    products: { created: number; updated: number; errors: { row: number; message: string }[] }
    categories: { created: number; errors: { row: number; message: string }[] }
    suppliers: { created: number; errors: { row: number; message: string }[] }
  }
  summary?: {
    totalRows: number
    productsCreated: number
    productsUpdated: number
    categoriesCreated: number
    suppliersCreated: number
  }
  error?: string
}

export default function ImportPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const router = useRouter()
  const [storeSlug, setStoreSlug] = useState<string>('')

  useState(() => {
    params.then((p) => setStoreSlug(p.storeSlug))
  })

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [previewTotals, setPreviewTotals] = useState<{
    products: number
    categories: number
    suppliers: number
  } | null>(null)
  const [validationErrors, setValidationErrors] = useState<{
    productErrors: ExcelParseError[]
    categoryErrors: ExcelParseError[]
    supplierErrors: ExcelParseError[]
  } | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'suppliers'>('products')

  const [options, setOptions] = useState({
    updateExisting: true,
    createCategories: true,
    createSuppliers: true,
  })

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file)
    setIsPreviewLoading(true)
    setImportResult(null)
    setPreviewData(null)
    setValidationErrors(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/stores/${storeSlug}/import`, {
        method: 'PUT',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar el archivo')
      }

      setPreviewData(data.preview)
      setPreviewTotals(data.totals)
      setValidationErrors(data.validationErrors)
      setActiveTab(
        data.totals.products > 0
          ? 'products'
          : data.totals.categories > 0
          ? 'categories'
          : 'suppliers'
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al procesar el archivo')
    } finally {
      setIsPreviewLoading(false)
    }
  }, [storeSlug])

  const handleImport = async () => {
    if (!selectedFile) return

    setIsImporting(true)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('updateExisting', String(options.updateExisting))
      formData.append('createCategories', String(options.createCategories))
      formData.append('createSuppliers', String(options.createSuppliers))

      const response = await fetch(`/api/stores/${storeSlug}/import`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.validationErrors) {
          setValidationErrors(data.validationErrors)
          toast.error('Se encontraron errores de validación')
        } else {
          throw new Error(data.error || 'Error al importar')
        }
        return
      }

      setImportResult(data)
      toast.success('Importación completada exitosamente')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al importar')
    } finally {
      setIsImporting(false)
    }
  }

  const downloadTemplate = () => {
    const templateContent = `SKU,Nombre,Precio Costo,Precio Venta,Stock,Stock Mínimo,Código de Barras,Categoría,Proveedor,Unidad
PROD-001,Producto Ejemplo 1,10.00,15.00,100,10,7501234567890,Categoría 1,Proveedor A,unidad
PROD-002,Producto Ejemplo 2,25.00,35.00,50,5,7501234567891,Categoría 2,Proveedor B,pieza`

    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'plantilla_productos.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const hasData = previewTotals && (previewTotals.products > 0 || previewTotals.categories > 0 || previewTotals.suppliers > 0)
  const hasErrors = validationErrors && (
    validationErrors.productErrors.length > 0 ||
    validationErrors.categoryErrors.length > 0 ||
    validationErrors.supplierErrors.length > 0
  )

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.push(`/dashboard/${storeSlug}/products`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a productos
        </Button>

        <h1 className="text-3xl font-bold mb-2">Importar desde Excel</h1>
        <p className="text-muted-foreground">
          Importa productos, categorías y proveedores desde un archivo Excel o CSV
        </p>
      </div>

      {importResult ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.success ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Importación Completada
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  Error en la Importación
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {importResult.summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Productos Creados</p>
                  <p className="text-2xl font-bold text-green-600">{importResult.summary.productsCreated}</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Productos Actualizados</p>
                  <p className="text-2xl font-bold text-blue-600">{importResult.summary.productsUpdated}</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Categorías Creadas</p>
                  <p className="text-2xl font-bold text-purple-600">{importResult.summary.categoriesCreated}</p>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Proveedores Creados</p>
                  <p className="text-2xl font-bold text-orange-600">{importResult.summary.suppliersCreated}</p>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button onClick={() => router.push(`/dashboard/${storeSlug}/products`)}>
                Ver Productos
              </Button>
              <Button variant="outline" onClick={() => {
                setImportResult(null)
                setSelectedFile(null)
                setPreviewData(null)
                setValidationErrors(null)
              }}>
                Nueva Importación
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Seleccionar Archivo</CardTitle>
              <CardDescription>
                Sube un archivo Excel (.xlsx, .xls) o CSV con tus datos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <ExcelUploader
                    onFileSelect={handleFileSelect}
                    isProcessing={isPreviewLoading || isImporting}
                  />
                </div>
                <div className="flex flex-col gap-4 md:border-l md:pl-6">
                  <p className="text-sm font-medium">¿No tienes un archivo?</p>
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Plantilla
                  </Button>
                  <div className="text-xs text-muted-foreground mt-2">
                    <p className="font-medium mb-1">Columnas soportadas:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>SKU, Nombre, Precio Costo</li>
                      <li>Precio Venta, Stock, Código de Barras</li>
                      <li>Categoría, Proveedor</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {(isPreviewLoading || previewData) && (
            <Card>
              <CardHeader>
                <CardTitle>2. Vista Previa</CardTitle>
                <CardDescription>
                  Revisa los datos antes de importar
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isPreviewLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : previewData && hasData ? (
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                    <TabsList className="mb-4">
                      <TabsTrigger value="products" className="gap-2">
                        <Package className="h-4 w-4" />
                        Productos
                        {previewTotals && (
                          <Badge variant="secondary" className="ml-1">
                            {previewTotals.products}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="categories" className="gap-2">
                        <FolderTree className="h-4 w-4" />
                        Categorías
                        {previewTotals && (
                          <Badge variant="secondary" className="ml-1">
                            {previewTotals.categories}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="suppliers" className="gap-2">
                        <Truck className="h-4 w-4" />
                        Proveedores
                        {previewTotals && (
                          <Badge variant="secondary" className="ml-1">
                            {previewTotals.suppliers}
                          </Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="products">
                      <ImportPreview
                        data={previewData}
                        errors={validationErrors || { productErrors: [], categoryErrors: [], supplierErrors: [] }}
                        activeTab="products"
                      />
                    </TabsContent>
                    <TabsContent value="categories">
                      <ImportPreview
                        data={previewData}
                        errors={validationErrors || { productErrors: [], categoryErrors: [], supplierErrors: [] }}
                        activeTab="categories"
                      />
                    </TabsContent>
                    <TabsContent value="suppliers">
                      <ImportPreview
                        data={previewData}
                        errors={validationErrors || { productErrors: [], categoryErrors: [], supplierErrors: [] }}
                        activeTab="suppliers"
                      />
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No se encontraron datos válidos en el archivo
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {hasErrors && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Errores de Validación</AlertTitle>
              <AlertDescription>
                Se encontraron {validationErrors?.productErrors.length || 0} errores en productos,{' '}
                {validationErrors?.categoryErrors.length || 0} en categorías y{' '}
                {validationErrors?.supplierErrors.length || 0} en proveedores.
                Revisa la vista previa para más detalles.
              </AlertDescription>
            </Alert>
          )}

          {previewData && hasData && (
            <Card>
              <CardHeader>
                <CardTitle>3. Opciones de Importación</CardTitle>
                <CardDescription>
                  Configura cómo se importarán los datos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="update-existing">Actualizar existentes</Label>
                      <p className="text-sm text-muted-foreground">
                        Si un producto con el mismo SKU ya existe, actualizar sus datos
                      </p>
                    </div>
                    <Switch
                      id="update-existing"
                      checked={options.updateExisting}
                      onCheckedChange={(checked) =>
                        setOptions((prev) => ({ ...prev, updateExisting: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="create-categories">Crear categorías automáticamente</Label>
                      <p className="text-sm text-muted-foreground">
                        Crear categorías que no existan en la base de datos
                      </p>
                    </div>
                    <Switch
                      id="create-categories"
                      checked={options.createCategories}
                      onCheckedChange={(checked) =>
                        setOptions((prev) => ({ ...prev, createCategories: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="create-suppliers">Crear proveedores automáticamente</Label>
                      <p className="text-sm text-muted-foreground">
                        Crear proveedores que no existan en la base de datos
                      </p>
                    </div>
                    <Switch
                      id="create-suppliers"
                      checked={options.createSuppliers}
                      onCheckedChange={(checked) =>
                        setOptions((prev) => ({ ...prev, createSuppliers: checked }))
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedFile(null)
                      setPreviewData(null)
                      setValidationErrors(null)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleImport} disabled={isImporting}>
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Importar Datos
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
