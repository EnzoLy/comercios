import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { SupplierProduct } from '@/lib/db/entities/supplier-product.entity'
import { SupplierProductPrice } from '@/lib/db/entities/supplier-product-price.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'

// Helper function to parse CSV
function parseCSV(csvText: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let insideQuotes = false

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i]
    const nextChar = csvText[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"'
        i++
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim())
      currentField = ''
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim())
        if (currentRow.some(field => field !== '')) {
          rows.push(currentRow)
        }
        currentRow = []
        currentField = ''
      }
      if (char === '\r' && nextChar === '\n') {
        i++
      }
    } else {
      currentField += char
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim())
    if (currentRow.some(field => field !== '')) {
      rows.push(currentRow)
    }
  }

  return rows
}

// Helper function to convert string to boolean
function parseBoolean(value: string): boolean {
  const normalized = value.toLowerCase().trim()
  return normalized === 'true' || normalized === 'yes' || normalized === '1'
}

// Helper function to convert string to number
function parseNumber(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const num = parseFloat(trimmed)
  return isNaN(num) ? undefined : num
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string; supplierId: string }> }
) {
  try {
    const { storeId, supplierId } = await params

    if (!storeId || !supplierId) {
      return NextResponse.json(
        { error: 'Store ID and Supplier ID required' },
        { status: 400 }
      )
    }

    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only CSV files are accepted' },
        { status: 400 }
      )
    }

    const dataSource = await getDataSource()
    const supplierRepo = dataSource.getRepository(Supplier)
    const productRepo = dataSource.getRepository(Product)
    const supplierProductRepo = dataSource.getRepository(SupplierProduct)
    const priceRepo = dataSource.getRepository(SupplierProductPrice)

    // Verify supplier exists and belongs to store
    const supplier = await supplierRepo.findOne({
      where: { id: supplierId, storeId },
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Read file content
    const csvText = await file.text()
    const rows = parseCSV(csvText)

    if (rows.length < 2) {
      return NextResponse.json(
        { error: 'CSV file must contain headers and at least one data row' },
        { status: 400 }
      )
    }

    const headers = rows[0].map(h => h.toLowerCase().trim())
    const dataRows = rows.slice(1)

    // Verify required columns
    const requiredColumns = ['sku']
    const missingColumns = requiredColumns.filter(col => !headers.includes(col))

    if (missingColumns.length > 0) {
      return NextResponse.json(
        { error: `Missing required columns: ${missingColumns.join(', ')}` },
        { status: 400 }
      )
    }

    const results: {
      success: number
      errors: Array<{ row: number; error: string; data?: any }>
      created: any[]
    } = {
      success: 0,
      errors: [],
      created: [],
    }

    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      const rowNumber = i + 2

      try {
        // Map CSV columns to data
        const rowData: any = {}

        headers.forEach((header, index) => {
          const value = row[index] || ''

          switch (header) {
            case 'sku':
            case 'suppliersku':
              const key = header === 'suppliersku' ? 'supplierSku' : 'sku'
              rowData[key] = value || undefined
              break
            case 'ispreferred':
              rowData.isPreferred = value ? parseBoolean(value) : false
              break
            case 'initialprice':
              rowData.initialPrice = parseNumber(value)
              break
          }
        })

        if (!rowData.sku) {
          results.errors.push({
            row: rowNumber,
            error: 'SKU is required',
            data: row,
          })
          continue
        }

        // Find product by SKU
        const product = await productRepo.findOne({
          where: { storeId, sku: rowData.sku },
        })

        if (!product) {
          results.errors.push({
            row: rowNumber,
            error: `Product with SKU "${rowData.sku}" not found`,
            data: row,
          })
          continue
        }

        // Check if product is already associated with this supplier
        const existingAssociation = await supplierProductRepo.findOne({
          where: { supplierId, productId: product.id, storeId },
        })

        if (existingAssociation) {
          results.errors.push({
            row: rowNumber,
            error: `Product "${product.name}" is already associated with this supplier`,
            data: row,
          })
          continue
        }

        // Create supplier-product association
        const supplierProduct = supplierProductRepo.create({
          supplierId,
          productId: product.id,
          storeId,
          supplierSku: rowData.supplierSku,
          isPreferred: rowData.isPreferred || false,
          isActive: true,
        })

        await supplierProductRepo.save(supplierProduct)

        // If initial price provided, create price record
        let priceRecord = null
        if (rowData.initialPrice !== undefined) {
          priceRecord = priceRepo.create({
            supplierId,
            productId: product.id,
            storeId,
            price: rowData.initialPrice,
            currency: supplier.currency || 'USD',
            effectiveDate: new Date(),
            endDate: undefined,
            sku: rowData.supplierSku,
            hasAlert: false,
          })

          await priceRepo.save(priceRecord)
        }

        results.success++
        results.created.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          supplierSku: rowData.supplierSku,
          isPreferred: rowData.isPreferred,
          initialPrice: rowData.initialPrice,
        })
      } catch (error: any) {
        console.error(`Error processing row ${rowNumber}:`, error)

        results.errors.push({
          row: rowNumber,
          error: error.message || 'Unknown error',
          data: row,
        })
      }
    }

    return NextResponse.json(results, { status: 200 })
  } catch (error: any) {
    console.error('Import supplier products error:', error)
    return NextResponse.json(
      { error: 'Failed to import supplier products', details: error.message },
      { status: 500 }
    )
  }
}
