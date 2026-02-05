import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Sale } from '@/lib/db/entities/sale.entity'
import { SaleItem } from '@/lib/db/entities/sale-item.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { ProductBarcode } from '@/lib/db/entities/product-barcode.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    // Require ADMIN role for reset operations
    await requireRole(storeId, [EmploymentRole.ADMIN])

    const body = await request.json()
    const { type } = body

    if (!type || !['sales', 'products', 'all'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid reset type. Must be: sales, products, or all' },
        { status: 400 }
      )
    }

    const dataSource = await getDataSource()

    let message = ''
    let deletedCounts = {
      sales: 0,
      saleItems: 0,
      products: 0,
      barcodes: 0,
    }

    // Reset Sales
    if (type === 'sales' || type === 'all') {
      const saleRepo = dataSource.getRepository(Sale)
      const saleItemRepo = dataSource.getRepository(SaleItem)

      // Get all sales for this store
      const sales = await saleRepo.find({
        where: { storeId },
      })

      if (sales.length > 0) {
        const saleIds = sales.map(s => s.id)

        // Delete sale items first (foreign key constraint)
        const deleteItemsResult = await saleItemRepo
          .createQueryBuilder()
          .delete()
          .where('saleId IN (:...saleIds)', { saleIds })
          .execute()

        deletedCounts.saleItems = deleteItemsResult.affected || 0

        // Delete sales
        const deleteSalesResult = await saleRepo
          .createQueryBuilder()
          .delete()
          .where('storeId = :storeId', { storeId })
          .execute()

        deletedCounts.sales = deleteSalesResult.affected || 0
      }
    }

    // Reset Products
    if (type === 'products' || type === 'all') {
      const productRepo = dataSource.getRepository(Product)
      const barcodeRepo = dataSource.getRepository(ProductBarcode)

      // Get all products for this store
      const products = await productRepo.find({
        where: { storeId },
      })

      if (products.length > 0) {
        const productIds = products.map(p => p.id)

        // Delete product barcodes first (foreign key constraint)
        const deleteBarcodesResult = await barcodeRepo
          .createQueryBuilder()
          .delete()
          .where('productId IN (:...productIds)', { productIds })
          .execute()

        deletedCounts.barcodes = deleteBarcodesResult.affected || 0

        // Delete products
        const deleteProductsResult = await productRepo
          .createQueryBuilder()
          .delete()
          .where('storeId = :storeId', { storeId })
          .execute()

        deletedCounts.products = deleteProductsResult.affected || 0
      }
    }

    // Build success message
    switch (type) {
      case 'sales':
        message = `Se eliminaron ${deletedCounts.sales} ventas y ${deletedCounts.saleItems} items de venta`
        break
      case 'products':
        message = `Se eliminaron ${deletedCounts.products} productos y ${deletedCounts.barcodes} códigos de barras`
        break
      case 'all':
        message = `Reset completo: ${deletedCounts.sales} ventas, ${deletedCounts.saleItems} items, ${deletedCounts.products} productos, ${deletedCounts.barcodes} códigos`
        break
    }

    return NextResponse.json({
      message,
      deletedCounts,
    })
  } catch (error) {
    console.error('Reset error:', error)
    return NextResponse.json(
      { error: 'Failed to reset data' },
      { status: 500 }
    )
  }
}
