import * as XLSX from 'xlsx'

export interface ParsedExcelData {
  products: Record<string, unknown>[]
  categories: Record<string, unknown>[]
  suppliers: Record<string, unknown>[]
  sheetNames: string[]
}

export interface ExcelParseError {
  row: number
  column: string
  message: string
  value?: unknown
}

const COLUMN_MAPPINGS = {
  products: {
    sku: ['sku', 'SKU', 'codigo', 'código', 'code', 'item'],
    name: ['nombre', 'name', 'producto', 'descripción', 'description', 'desc'],
    costPrice: ['costo', 'cost', 'precio_costo', 'precio compra', 'purchase_price'],
    sellingPrice: ['precio', 'price', 'precio_venta', 'selling_price', 'venta', 'pvp'],
    currentStock: ['stock', 'inventario', 'existencia', 'cantidad', 'quantity', 'qty'],
    minStockLevel: ['stock_minimo', 'min_stock', 'minimo', 'stock_min'],
    barcode: ['barcode', 'codigo_barras', 'código de barras', 'ean', 'upc'],
    category: ['categoria', 'category', 'categoría', 'cat', 'familia'],
    supplier: ['proveedor', 'supplier', 'provider', 'prov'],
    description: ['descripcion', 'description', 'detalle', 'notes', 'notas'],
    unit: ['unidad', 'unit', 'medida', 'uom'],
  },
  categories: {
    name: ['nombre', 'name', 'categoria', 'categoría'],
    description: ['descripcion', 'description', 'detalle'],
    parentCategory: ['padre', 'parent', 'categoria_padre', 'parent_category'],
  },
  suppliers: {
    name: ['nombre', 'name', 'proveedor', 'razon_social', 'company'],
    contactPerson: ['contacto', 'contact', 'persona', 'representante'],
    email: ['email', 'correo', 'mail', 'e_mail'],
    phone: ['telefono', 'teléfono', 'phone', 'tel', 'celular'],
    taxId: ['rfc', 'tax_id', 'nit', 'taxid', 'rut'],
    address: ['direccion', 'dirección', 'address', 'domicilio'],
    city: ['ciudad', 'city', 'municipio'],
    state: ['estado', 'state', 'provincia', 'departamento'],
    country: ['pais', 'país', 'country'],
    website: ['web', 'website', 'sitio', 'url'],
    notes: ['notas', 'notes', 'observaciones', 'obs'],
  },
}

function findColumnMapping(
  row: Record<string, unknown>,
  fieldMappings: string[]
): { key: string; value: unknown } | null {
  for (const key of Object.keys(row)) {
    const normalizedKey = key.toLowerCase().trim().replace(/[_\s]+/g, '_')
    for (const mapping of fieldMappings) {
      const normalizedMapping = mapping.toLowerCase().trim().replace(/[_\s]+/g, '_')
      if (normalizedKey === normalizedMapping) {
        return { key, value: row[key] }
      }
    }
  }
  return null
}

function mapRowToEntity(
  row: Record<string, unknown>,
  entityType: 'products' | 'categories' | 'suppliers'
): Record<string, unknown> {
  const mappings = COLUMN_MAPPINGS[entityType]
  const mapped: Record<string, unknown> = {}

  for (const [field, aliases] of Object.entries(mappings)) {
    const result = findColumnMapping(row, aliases)
    if (result && result.value !== undefined && result.value !== null && result.value !== '') {
      mapped[field] = result.value
    }
  }

  for (const [key, value] of Object.entries(row)) {
    if (!Object.values(COLUMN_MAPPINGS[entityType]).some((aliases) =>
      aliases.some((alias) => key.toLowerCase().trim() === alias.toLowerCase().trim())
    )) {
      mapped[`extra_${key}`] = value
    }
  }

  return mapped
}

export function parseExcel(buffer: Buffer): ParsedExcelData {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const result: ParsedExcelData = {
    products: [],
    categories: [],
    suppliers: [],
    sheetNames: workbook.SheetNames,
  }

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

    if (jsonData.length === 0) continue

    const normalizedName = sheetName.toLowerCase().trim()

    if (normalizedName.includes('producto') || normalizedName.includes('product') || normalizedName === 'items' || normalizedName === 'articulos') {
      result.products = jsonData.map((row) => mapRowToEntity(row, 'products'))
    } else if (normalizedName.includes('categoria') || normalizedName.includes('category') || normalizedName.includes('categoría') || normalizedName === 'cats') {
      result.categories = jsonData.map((row) => mapRowToEntity(row, 'categories'))
    } else if (normalizedName.includes('proveedor') || normalizedName.includes('supplier') || normalizedName.includes('provider') || normalizedName === 'prov') {
      result.suppliers = jsonData.map((row) => mapRowToEntity(row, 'suppliers'))
    } else if (result.products.length === 0 && jsonData.length > 0) {
      const sampleRow = jsonData[0]
      const hasProductFields = Object.keys(sampleRow).some((key) => {
        const k = key.toLowerCase()
        return k.includes('sku') || k.includes('codigo') || k.includes('producto') || k.includes('precio')
      })
      if (hasProductFields) {
        result.products = jsonData.map((row) => mapRowToEntity(row, 'products'))
      }
    }
  }

  return result
}

export function validateProductRow(
  row: Record<string, unknown>,
  rowNum: number
): ExcelParseError[] {
  const errors: ExcelParseError[] = []

  if (!row.name && !row.sku) {
    errors.push({
      row: rowNum,
      column: 'name/sku',
      message: 'El producto debe tener al menos un nombre o SKU',
    })
  }

  if (row.sellingPrice !== undefined && row.sellingPrice !== null) {
    const price = Number(row.sellingPrice)
    if (isNaN(price) || price < 0) {
      errors.push({
        row: rowNum,
        column: 'sellingPrice',
        message: 'El precio de venta debe ser un número positivo',
        value: row.sellingPrice,
      })
    }
  }

  if (row.costPrice !== undefined && row.costPrice !== null) {
    const cost = Number(row.costPrice)
    if (isNaN(cost) || cost < 0) {
      errors.push({
        row: rowNum,
        column: 'costPrice',
        message: 'El precio de costo debe ser un número positivo',
        value: row.costPrice,
      })
    }
  }

  if (row.currentStock !== undefined && row.currentStock !== null) {
    const stock = Number(row.currentStock)
    if (isNaN(stock) || !Number.isInteger(stock)) {
      errors.push({
        row: rowNum,
        column: 'currentStock',
        message: 'El stock debe ser un número entero',
        value: row.currentStock,
      })
    }
  }

  return errors
}

export function validateCategoryRow(
  row: Record<string, unknown>,
  rowNum: number
): ExcelParseError[] {
  const errors: ExcelParseError[] = []

  if (!row.name) {
    errors.push({
      row: rowNum,
      column: 'name',
      message: 'La categoría debe tener un nombre',
    })
  }

  return errors
}

export function validateSupplierRow(
  row: Record<string, unknown>,
  rowNum: number
): ExcelParseError[] {
  const errors: ExcelParseError[] = []

  if (!row.name) {
    errors.push({
      row: rowNum,
      column: 'name',
      message: 'El proveedor debe tener un nombre',
    })
  }

  if (row.email && typeof row.email === 'string') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(row.email)) {
      errors.push({
        row: rowNum,
        column: 'email',
        message: 'El email no tiene un formato válido',
        value: row.email,
      })
    }
  }

  return errors
}

export function validateExcelData(data: ParsedExcelData): {
  productErrors: ExcelParseError[]
  categoryErrors: ExcelParseError[]
  supplierErrors: ExcelParseError[]
} {
  return {
    productErrors: data.products.flatMap((row, idx) => validateProductRow(row, idx + 2)),
    categoryErrors: data.categories.flatMap((row, idx) => validateCategoryRow(row, idx + 2)),
    supplierErrors: data.suppliers.flatMap((row, idx) => validateSupplierRow(row, idx + 2)),
  }
}
