import { NextResponse } from 'next/server'
import { requireStoreAccess } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { SupplierProduct } from '@/lib/db/entities/supplier-product.entity'
import { SupplierProductPrice } from '@/lib/db/entities/supplier-product-price.entity'
import { IsNull } from 'typeorm'

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

    if (!['csv', 'excel'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be csv or excel' },
        { status: 400 }
      )
    }

    const dataSource = await getDataSource()
    const supplierRepo = dataSource.getRepository(Supplier)
    const supplierProductRepo = dataSource.getRepository(SupplierProduct)
    const priceRepo = dataSource.getRepository(SupplierProductPrice)

    // Verify supplier exists and belongs to store
    const supplier = await supplierRepo.findOne({
      where: { id: supplierId, storeId },
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Get all products for this supplier with product details
    const supplierProducts = await supplierProductRepo
      .createQueryBuilder('sp')
      .leftJoinAndSelect('sp.product', 'product')
      .where('sp.supplierId = :supplierId', { supplierId })
      .andWhere('sp.storeId = :storeId', { storeId })
      .orderBy('product.name', 'ASC')
      .getMany()

    // Get current prices for all products
    const productsWithPrices = await Promise.all(
      supplierProducts.map(async (sp) => {
        const currentPrice = await priceRepo.findOne({
          where: {
            supplierId,
            productId: sp.productId,
            endDate: IsNull(),
          },
        })

        return {
          productName: sp.product?.name || '',
          sku: sp.product?.sku || '',
          supplierSku: sp.supplierSku || '',
          currentPrice: currentPrice?.price || '',
          currency: currentPrice?.currency || supplier.currency,
          minimumOrderQuantity: currentPrice?.minimumOrderQuantity || '',
          packSize: currentPrice?.packSize || '',
          isPreferred: sp.isPreferred,
          lastPurchaseDate: sp.lastPurchaseDate,
          lastPurchasePrice: sp.lastPurchasePrice || '',
        }
      })
    )

    const today = new Date().toISOString().split('T')[0]
    const supplierName = supplier.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    const filename = `supplier-${supplierName}-products-${today}`

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'productName',
        'sku',
        'supplierSku',
        'currentPrice',
        'currency',
        'minimumOrderQuantity',
        'packSize',
        'isPreferred',
        'lastPurchaseDate',
        'lastPurchasePrice'
      ]

      const csvRows = [
        headers.join(','),
        ...productsWithPrices.map(product =>
          [
            escapeCsvValue(product.productName),
            escapeCsvValue(product.sku),
            escapeCsvValue(product.supplierSku),
            escapeCsvValue(product.currentPrice),
            escapeCsvValue(product.currency),
            escapeCsvValue(product.minimumOrderQuantity),
            escapeCsvValue(product.packSize),
            escapeCsvValue(product.isPreferred),
            escapeCsvValue(formatDate(product.lastPurchaseDate)),
            escapeCsvValue(product.lastPurchasePrice)
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
        'Supplier SKU',
        'Current Price',
        'Currency',
        'Min Order Qty',
        'Pack Size',
        'Is Preferred',
        'Last Purchase Date',
        'Last Purchase Price'
      ]

      const rows = [
        headers.join('\t'),
        ...productsWithPrices.map(product =>
          [
            product.productName,
            product.sku,
            product.supplierSku,
            product.currentPrice,
            product.currency,
            product.minimumOrderQuantity,
            product.packSize,
            product.isPreferred ? 'Yes' : 'No',
            formatDate(product.lastPurchaseDate),
            product.lastPurchasePrice
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
    console.error('Export supplier products error:', error)
    return NextResponse.json(
      { error: 'Failed to export supplier products' },
      { status: 500 }
    )
  }
}
