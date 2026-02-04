import { NextResponse } from 'next/server'
import { requireStoreAccess } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { SupplierProductPrice } from '@/lib/db/entities/supplier-product-price.entity'
import { Product } from '@/lib/db/entities/product.entity'

// Helper function to escape CSV values
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) return ''
  const stringValue = String(value)
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

// Helper function to format date
function formatDate(date: Date | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

export async function GET(
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

    await requireStoreAccess(storeId)

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'
    const productId = searchParams.get('productId')

    if (!['csv', 'excel'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be csv or excel' },
        { status: 400 }
      )
    }

    const dataSource = await getDataSource()
    const supplierRepo = dataSource.getRepository(Supplier)
    const priceRepo = dataSource.getRepository(SupplierProductPrice)

    // Verify supplier exists and belongs to store
    const supplier = await supplierRepo.findOne({
      where: { id: supplierId, storeId },
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Build query for price history
    let query = priceRepo
      .createQueryBuilder('price')
      .leftJoinAndSelect('price.product', 'product')
      .where('price.supplierId = :supplierId', { supplierId })
      .andWhere('price.storeId = :storeId', { storeId })

    // Filter by specific product if provided
    if (productId) {
      query = query.andWhere('price.productId = :productId', { productId })
    }

    query = query.orderBy('product.name', 'ASC')
      .addOrderBy('price.effectiveDate', 'DESC')

    const prices = await query.getMany()

    // Transform data
    const priceData = prices.map(price => ({
      productName: price.product?.name || '',
      sku: price.product?.sku || '',
      price: price.price,
      currency: price.currency,
      effectiveDate: price.effectiveDate,
      endDate: price.endDate,
      changePercentage: price.changePercentage || '',
      hasAlert: price.hasAlert,
    }))

    const today = new Date().toISOString().split('T')[0]
    const supplierName = supplier.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    const filename = `supplier-${supplierName}-prices-${today}`

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'productName',
        'sku',
        'price',
        'currency',
        'effectiveDate',
        'endDate',
        'changePercentage',
        'hasAlert'
      ]

      const csvRows = [
        headers.join(','),
        ...priceData.map(item =>
          [
            escapeCsvValue(item.productName),
            escapeCsvValue(item.sku),
            escapeCsvValue(item.price),
            escapeCsvValue(item.currency),
            escapeCsvValue(formatDate(item.effectiveDate)),
            escapeCsvValue(formatDate(item.endDate)),
            escapeCsvValue(item.changePercentage),
            escapeCsvValue(item.hasAlert)
          ].join(',')
        )
      ]

      const csvContent = csvRows.join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      })
    } else {
      // Excel format (tab-separated values)
      const headers = [
        'Product Name',
        'SKU',
        'Price',
        'Currency',
        'Effective Date',
        'End Date',
        'Change %',
        'Has Alert'
      ]

      const rows = [
        headers.join('\t'),
        ...priceData.map(item =>
          [
            item.productName,
            item.sku,
            item.price,
            item.currency,
            formatDate(item.effectiveDate),
            formatDate(item.endDate),
            item.changePercentage,
            item.hasAlert ? 'Yes' : 'No'
          ].join('\t')
        )
      ]

      const tsvContent = rows.join('\n')

      return new NextResponse(tsvContent, {
        headers: {
          'Content-Type': 'application/vnd.ms-excel',
          'Content-Disposition': `attachment; filename="${filename}.xls"`,
        },
      })
    }
  } catch (error) {
    console.error('Export supplier prices error:', error)
    return NextResponse.json(
      { error: 'Failed to export supplier prices' },
      { status: 500 }
    )
  }
}
