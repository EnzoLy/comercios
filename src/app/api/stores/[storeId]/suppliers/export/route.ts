import { NextResponse } from 'next/server'
import { requireStoreAccess } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { supplierQuerySchema } from '@/lib/validations/supplier.schema'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    await requireStoreAccess(storeId)

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'

    // Parse query params for filtering
    const queryParams = Object.fromEntries(searchParams.entries())
    const validated = supplierQuerySchema.parse({
      ...queryParams,
      page: 1,
      limit: 10000, // Export all matching records
    })

    const dataSource = await getDataSource()
    const supplierRepo = dataSource.getRepository(Supplier)

    let query = supplierRepo
      .createQueryBuilder('supplier')
      .where('supplier.storeId = :storeId', { storeId })

    // Apply filters (same as list query)
    if (validated.search) {
      query = query.andWhere(
        '(supplier.name ILIKE :search OR supplier.city ILIKE :search OR supplier.state ILIKE :search)',
        { search: `%${validated.search}%` }
      )
    }

    if (validated.city) {
      query = query.andWhere('supplier.city = :city', { city: validated.city })
    }

    if (validated.state) {
      query = query.andWhere('supplier.state = :state', { state: validated.state })
    }

    if (validated.isActive && validated.isActive !== 'all') {
      query = query.andWhere('supplier.isActive = :isActive', {
        isActive: validated.isActive === 'true'
      })
    }

    if (validated.isPreferred) {
      query = query.andWhere('supplier.isPreferred = :isPreferred', {
        isPreferred: validated.isPreferred === 'true'
      })
    }

    const suppliers = await query.getMany()

    if (format === 'csv') {
      // Build CSV manually
      const headers = [
        'Name',
        'Tax ID',
        'Address',
        'City',
        'State',
        'Zip Code',
        'Country',
        'Website',
        'Currency',
        'Rating',
        'Is Preferred',
        'Is Active',
        'Contact Person',
        'Email',
        'Phone',
        'Notes'
      ]

      const rows = suppliers.map(supplier => [
        supplier.name,
        supplier.taxId || '',
        supplier.address || '',
        supplier.city || '',
        supplier.state || '',
        supplier.zipCode || '',
        supplier.country || '',
        supplier.website || '',
        supplier.currency,
        supplier.rating?.toString() || '',
        supplier.isPreferred ? 'Yes' : 'No',
        supplier.isActive ? 'Yes' : 'No',
        supplier.contactPerson || '',
        supplier.email || '',
        supplier.phone || '',
        supplier.notes || ''
      ])

      const csv = [headers, ...rows]
        .map(row => row.map(v => `"${v}"`).join(','))
        .join('\n')

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="suppliers.csv"'
        }
      })
    }

    return NextResponse.json(
      { error: 'Invalid format. Only CSV is supported.' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Export suppliers error:', error)
    return NextResponse.json(
      { error: 'Failed to export suppliers' },
      { status: 500 }
    )
  }
}
