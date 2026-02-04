import { NextResponse } from 'next/server'
import { requireStoreAccess } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { SupplierProductPrice } from '@/lib/db/entities/supplier-product-price.entity'

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
    const limit = parseInt(searchParams.get('limit') || '10')

    const dataSource = await getDataSource()
    const priceRepo = dataSource.getRepository(SupplierProductPrice)

    // Get price records with alerts, ordered by most recent
    const priceAlerts = await priceRepo
      .createQueryBuilder('price')
      .leftJoinAndSelect('price.product', 'product')
      .leftJoinAndSelect('price.supplier', 'supplier')
      .where('price.storeId = :storeId', { storeId })
      .andWhere('price.hasAlert = :hasAlert', { hasAlert: true })
      .andWhere('price.endDate IS NULL') // Current prices only
      .orderBy('price.createdAt', 'DESC')
      .take(limit)
      .getMany()

    // For each alert, get the previous price to show old vs new
    const alertsWithHistory = await Promise.all(
      priceAlerts.map(async (alert) => {
        // Get the previous price (the one that ended when this one started)
        const previousPrice = await priceRepo
          .createQueryBuilder('price')
          .where('price.storeId = :storeId', { storeId })
          .andWhere('price.supplierId = :supplierId', { supplierId: alert.supplierId })
          .andWhere('price.productId = :productId', { productId: alert.productId })
          .andWhere('price.endDate = :endDate', { endDate: alert.effectiveDate })
          .orderBy('price.effectiveDate', 'DESC')
          .getOne()

        return {
          id: alert.id,
          productId: alert.productId,
          productName: (alert.product as any)?.name || 'Unknown Product',
          productSku: (alert.product as any)?.sku || '',
          supplierId: alert.supplierId,
          supplierName: (alert.supplier as any)?.name || 'Unknown Supplier',
          currentPrice: Number(alert.price),
          previousPrice: previousPrice ? Number(previousPrice.price) : null,
          currency: alert.currency,
          changePercentage: alert.changePercentage ? Number(alert.changePercentage) : null,
          effectiveDate: alert.effectiveDate,
          createdAt: alert.createdAt,
        }
      })
    )

    return NextResponse.json({ alerts: alertsWithHistory })
  } catch (error: any) {
    console.error('Price alerts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch price alerts' },
      { status: 500 }
    )
  }
}
