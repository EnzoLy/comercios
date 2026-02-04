import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { SupplierProduct } from '@/lib/db/entities/supplier-product.entity'
import { SupplierProductPrice } from '@/lib/db/entities/supplier-product-price.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { IsNull } from 'typeorm'

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

// Helper function to convert string to number
function parseNumber(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const num = parseFloat(trimmed)
  return isNaN(num) ? undefined : num
}

// Helper function to parse date
function parseDate(value: string): Date | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const date = new Date(trimmed)
  return isNaN(date.getTime()) ? undefined : date
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
    const requiredColumns = ['sku', 'price']
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
      updated: any[]
    } = {
      success: 0,
      errors: [],
      updated: [],
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0) // Normalize to start of day

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
              rowData.sku = value || undefined
              break
            case 'price':
              rowData.price = parseNumber(value)
              break
            case 'effectivedate':
              rowData.effectiveDate = parseDate(value)
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

        if (rowData.price === undefined) {
          results.errors.push({
            row: rowNumber,
            error: 'Price is required and must be a valid number',
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

        // Verify the product is associated with this supplier
        const supplierProduct = await supplierProductRepo.findOne({
          where: { supplierId, productId: product.id, storeId },
        })

        if (!supplierProduct) {
          results.errors.push({
            row: rowNumber,
            error: `Product "${product.name}" is not associated with this supplier`,
            data: row,
          })
          continue
        }

        // Get current price (where endDate is NULL)
        const currentPrice = await priceRepo.findOne({
          where: {
            supplierId,
            productId: product.id,
            storeId,
            endDate: IsNull(),
          },
          order: { effectiveDate: 'DESC' },
        })

        const effectiveDate = rowData.effectiveDate || today

        let changePercentage: number | null = null
        let hasAlert = false

        // If there's a current price, calculate change and update its endDate
        if (currentPrice) {
          // Calculate percentage change
          const priceDifference = rowData.price - Number(currentPrice.price)
          changePercentage = (priceDifference / Number(currentPrice.price)) * 100

          // Set alert flag if price increased by more than 5%
          if (changePercentage > 5) {
            hasAlert = true
          }

          // Set endDate on current price to today
          currentPrice.endDate = today
          await priceRepo.save(currentPrice)

          // Update last purchase price on supplier product
          supplierProduct.lastPurchasePrice = Number(currentPrice.price)
          supplierProduct.lastPurchaseDate = currentPrice.effectiveDate
          await supplierProductRepo.save(supplierProduct)
        }

        // Create new price record
        const newPrice = priceRepo.create({
          supplierId,
          productId: product.id,
          storeId,
          price: rowData.price,
          currency: supplier.currency || 'USD',
          effectiveDate,
          endDate: undefined, // This is now the current price
          sku: supplierProduct.supplierSku,
          hasAlert,
          changePercentage: changePercentage !== null ? changePercentage : undefined,
        })

        await priceRepo.save(newPrice)

        results.success++
        results.updated.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          price: rowData.price,
          effectiveDate,
          previousPrice: currentPrice ? Number(currentPrice.price) : null,
          changePercentage,
          hasAlert,
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
    console.error('Import supplier prices error:', error)
    return NextResponse.json(
      { error: 'Failed to import supplier prices', details: error.message },
      { status: 500 }
    )
  }
}
