import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { createSupplierSchema } from '@/lib/validations/supplier.schema'

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
        // Escaped quote
        currentField += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      // End of field
      currentRow.push(currentField.trim())
      currentField = ''
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      // End of row
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim())
        if (currentRow.some(field => field !== '')) {
          rows.push(currentRow)
        }
        currentRow = []
        currentField = ''
      }
      // Skip \r\n combination
      if (char === '\r' && nextChar === '\n') {
        i++
      }
    } else {
      currentField += char
    }
  }

  // Add last field and row if any
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
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
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
    const requiredColumns = ['name']
    const missingColumns = requiredColumns.filter(col => !headers.includes(col))

    if (missingColumns.length > 0) {
      return NextResponse.json(
        { error: `Missing required columns: ${missingColumns.join(', ')}` },
        { status: 400 }
      )
    }

    const dataSource = await getDataSource()
    const supplierRepo = dataSource.getRepository(Supplier)

    const results: {
      success: number
      errors: Array<{ row: number; error: string; data?: any }>
      created: Supplier[]
    } = {
      success: 0,
      errors: [],
      created: [],
    }

    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      const rowNumber = i + 2 // +2 because of 0-index and header row

      try {
        // Map CSV columns to supplier data
        const supplierData: any = {}

        headers.forEach((header, index) => {
          const value = row[index] || ''

          switch (header) {
            case 'name':
            case 'taxid':
            case 'website':
            case 'address':
            case 'city':
            case 'state':
            case 'zipcode':
            case 'country':
            case 'contactperson':
            case 'email':
            case 'phone':
            case 'currency':
            case 'notes':
              // Map taxid to taxId, zipcode to zipCode, contactperson to contactPerson
              const key = header === 'taxid' ? 'taxId'
                        : header === 'zipcode' ? 'zipCode'
                        : header === 'contactperson' ? 'contactPerson'
                        : header
              supplierData[key] = value || undefined
              break
            case 'rating':
              supplierData.rating = parseNumber(value)
              break
            case 'ispreferred':
              supplierData.isPreferred = value ? parseBoolean(value) : false
              break
            case 'isactive':
              supplierData.isActive = value ? parseBoolean(value) : true
              break
          }
        })

        // Validate data
        const validated = createSupplierSchema.parse(supplierData)

        // Check for duplicate name in same store
        const existingSupplier = await supplierRepo.findOne({
          where: { storeId, name: validated.name },
        })

        if (existingSupplier) {
          results.errors.push({
            row: rowNumber,
            error: `Supplier with name "${validated.name}" already exists`,
            data: supplierData,
          })
          continue
        }

        // Create supplier
        const supplier = supplierRepo.create({
          ...validated,
          storeId,
        })

        await supplierRepo.save(supplier)

        results.success++
        results.created.push(supplier)
      } catch (error: any) {
        console.error(`Error processing row ${rowNumber}:`, error)

        let errorMessage = 'Unknown error'
        if (error.name === 'ZodError') {
          errorMessage = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
        } else if (error.message) {
          errorMessage = error.message
        }

        results.errors.push({
          row: rowNumber,
          error: errorMessage,
          data: row,
        })
      }
    }

    return NextResponse.json(results, { status: 200 })
  } catch (error: any) {
    console.error('Import suppliers error:', error)
    return NextResponse.json(
      { error: 'Failed to import suppliers', details: error.message },
      { status: 500 }
    )
  }
}
