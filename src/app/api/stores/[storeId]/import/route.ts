import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/permissions'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { parseExcel, validateExcelData } from '@/lib/import/excel-parser'
import { importData } from '@/lib/import/data-mapper'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const updateExisting = formData.get('updateExisting') === 'true'
    const createCategories = formData.get('createCategories') !== 'false'
    const createSuppliers = formData.get('createSuppliers') !== 'false'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ]

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an Excel file (.xlsx, .xls) or CSV' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const parsedData = parseExcel(buffer)

    if (
      parsedData.products.length === 0 &&
      parsedData.categories.length === 0 &&
      parsedData.suppliers.length === 0
    ) {
      return NextResponse.json(
        { error: 'No se encontraron datos válidos en el archivo. Asegúrate de que las hojas tengan nombres como "Productos", "Categorías" o "Proveedores"' },
        { status: 400 }
      )
    }

    const validationErrors = validateExcelData(parsedData)
    const hasCriticalErrors =
      validationErrors.productErrors.some((e) => e.column === 'name/sku') ||
      validationErrors.categoryErrors.some((e) => e.column === 'name') ||
      validationErrors.supplierErrors.some((e) => e.column === 'name')

    if (hasCriticalErrors) {
      return NextResponse.json({
        error: 'Se encontraron errores críticos en el archivo',
        validationErrors,
        preview: {
          products: parsedData.products.slice(0, 10),
          categories: parsedData.categories.slice(0, 10),
          suppliers: parsedData.suppliers.slice(0, 10),
        },
      }, { status: 400 })
    }

    const result = await importData(storeId, parsedData, {
      updateExisting,
      createCategories,
      createSuppliers,
    })

    return NextResponse.json({
      success: true,
      result,
      validationErrors: {
        productErrors: validationErrors.productErrors.filter((e) => e.column !== 'name/sku'),
        categoryErrors: validationErrors.categoryErrors.filter((e) => e.column !== 'name'),
        supplierErrors: validationErrors.supplierErrors.filter((e) => e.column !== 'name'),
      },
      summary: {
        totalRows: parsedData.products.length + parsedData.categories.length + parsedData.suppliers.length,
        productsCreated: result.products.created,
        productsUpdated: result.products.updated,
        categoriesCreated: result.categories.created,
        suppliersCreated: result.suppliers.created,
      },
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import data' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const parsedData = parseExcel(buffer)
    const validationErrors = validateExcelData(parsedData)

    return NextResponse.json({
      preview: {
        products: parsedData.products.slice(0, 20),
        categories: parsedData.categories.slice(0, 20),
        suppliers: parsedData.suppliers.slice(0, 20),
      },
      totals: {
        products: parsedData.products.length,
        categories: parsedData.categories.length,
        suppliers: parsedData.suppliers.length,
      },
      sheetNames: parsedData.sheetNames,
      validationErrors,
    })
  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to preview data' },
      { status: 500 }
    )
  }
}
