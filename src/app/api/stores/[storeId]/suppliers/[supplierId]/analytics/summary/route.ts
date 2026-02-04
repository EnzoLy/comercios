import { NextResponse } from 'next/server'
import { requireStoreAccess } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { SupplierProduct } from '@/lib/db/entities/supplier-product.entity'
import { SupplierProductPrice } from '@/lib/db/entities/supplier-product-price.entity'
import { PurchaseOrder, PurchaseOrderStatus } from '@/lib/db/entities/purchase-order.entity'
import { MoreThanOrEqual } from 'typeorm'

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

    const dataSource = await getDataSource()
    const supplierRepo = dataSource.getRepository(Supplier)
    const supplierProductRepo = dataSource.getRepository(SupplierProduct)
    const priceRepo = dataSource.getRepository(SupplierProductPrice)
    const purchaseOrderRepo = dataSource.getRepository(PurchaseOrder)

    // Verify supplier exists
    const supplier = await supplierRepo.findOne({
      where: { id: supplierId, storeId },
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // 1. Total products count
    const totalProductsCount = await supplierProductRepo.count({
      where: { supplierId, storeId },
    })

    // 2. Total active products
    const activeProductsCount = await supplierProductRepo.count({
      where: { supplierId, storeId, isActive: true },
    })

    // 3. Recent price changes (last 30 days)
    const recentPriceChanges = await priceRepo
      .createQueryBuilder('price')
      .where('price.supplierId = :supplierId', { supplierId })
      .andWhere('price.storeId = :storeId', { storeId })
      .andWhere('price.effectiveDate >= :thirtyDaysAgo', { thirtyDaysAgo })
      .getCount()

    // 4. Price alerts count (hasAlert = true)
    const priceAlertsCount = await priceRepo
      .createQueryBuilder('price')
      .where('price.supplierId = :supplierId', { supplierId })
      .andWhere('price.storeId = :storeId', { storeId })
      .andWhere('price.hasAlert = :hasAlert', { hasAlert: true })
      .andWhere('price.endDate IS NULL') // Only current prices
      .getCount()

    // 5. Average price change percentage (for recent changes)
    const recentPricesWithChange = await priceRepo
      .createQueryBuilder('price')
      .where('price.supplierId = :supplierId', { supplierId })
      .andWhere('price.storeId = :storeId', { storeId })
      .andWhere('price.effectiveDate >= :thirtyDaysAgo', { thirtyDaysAgo })
      .andWhere('price.changePercentage IS NOT NULL')
      .getMany()

    let averagePriceChangePercent: number | null = null
    if (recentPricesWithChange.length > 0) {
      const totalChange = recentPricesWithChange.reduce(
        (sum, price) => sum + (price.changePercentage ? Number(price.changePercentage) : 0),
        0
      )
      averagePriceChangePercent = Number((totalChange / recentPricesWithChange.length).toFixed(2))
    }

    // 6. Recent purchase orders (last 30 days)
    const recentPurchaseOrders = await purchaseOrderRepo
      .createQueryBuilder('po')
      .where('po.supplierId = :supplierId', { supplierId })
      .andWhere('po.storeId = :storeId', { storeId })
      .andWhere('po.orderDate >= :thirtyDaysAgo', { thirtyDaysAgo })
      .orderBy('po.orderDate', 'DESC')
      .take(10) // Limit to 10 most recent
      .getMany()

    const recentPurchaseOrdersCount = recentPurchaseOrders.length

    // 7. Total purchase amount (last 30 days)
    const purchaseAmountResult = await purchaseOrderRepo
      .createQueryBuilder('po')
      .select('SUM(po.totalAmount)', 'total')
      .where('po.supplierId = :supplierId', { supplierId })
      .andWhere('po.storeId = :storeId', { storeId })
      .andWhere('po.orderDate >= :thirtyDaysAgo', { thirtyDaysAgo })
      .andWhere('po.status != :cancelledStatus', { cancelledStatus: PurchaseOrderStatus.CANCELLED })
      .getRawOne()

    const totalPurchaseAmount = purchaseAmountResult?.total
      ? Number(purchaseAmountResult.total)
      : 0

    // 8. Purchase order status breakdown (last 30 days)
    const statusBreakdown = await purchaseOrderRepo
      .createQueryBuilder('po')
      .select('po.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(po.totalAmount)', 'totalAmount')
      .where('po.supplierId = :supplierId', { supplierId })
      .andWhere('po.storeId = :storeId', { storeId })
      .andWhere('po.orderDate >= :thirtyDaysAgo', { thirtyDaysAgo })
      .groupBy('po.status')
      .getRawMany()

    const purchaseOrdersByStatus = statusBreakdown.map(item => ({
      status: item.status,
      count: Number(item.count),
      totalAmount: item.totalAmount ? Number(item.totalAmount) : 0,
    }))

    // 9. Get price alerts details (for reference)
    const priceAlerts = await priceRepo
      .createQueryBuilder('price')
      .leftJoinAndSelect('price.product', 'product')
      .where('price.supplierId = :supplierId', { supplierId })
      .andWhere('price.storeId = :storeId', { storeId })
      .andWhere('price.hasAlert = :hasAlert', { hasAlert: true })
      .andWhere('price.endDate IS NULL')
      .orderBy('price.changePercentage', 'DESC')
      .take(5) // Top 5 price alerts
      .getMany()

    const topPriceAlerts = priceAlerts.map(price => ({
      productId: price.productId,
      productName: price.product?.name || 'Unknown',
      price: Number(price.price),
      changePercentage: price.changePercentage ? Number(price.changePercentage) : null,
      effectiveDate: price.effectiveDate,
    }))

    // 10. Calculate performance metrics
    const performanceMetrics = {
      totalOrders: recentPurchaseOrdersCount,
      totalSpent: Number(totalPurchaseAmount.toFixed(2)),
      averageOrderValue:
        recentPurchaseOrdersCount > 0
          ? Number((totalPurchaseAmount / recentPurchaseOrdersCount).toFixed(2))
          : 0,
      onTimeDeliveryRate: calculateOnTimeDeliveryRate(recentPurchaseOrders),
    }

    return NextResponse.json({
      supplier: {
        id: supplier.id,
        name: supplier.name,
        isActive: supplier.isActive,
        isPreferred: supplier.isPreferred,
        rating: supplier.rating,
      },
      products: {
        total: totalProductsCount,
        active: activeProductsCount,
        inactive: totalProductsCount - activeProductsCount,
      },
      prices: {
        recentChanges: recentPriceChanges,
        alerts: priceAlertsCount,
        averageChangePercent: averagePriceChangePercent,
        topAlerts: topPriceAlerts,
      },
      purchaseOrders: {
        recent: recentPurchaseOrdersCount,
        totalAmount: Number(totalPurchaseAmount.toFixed(2)),
        byStatus: purchaseOrdersByStatus,
      },
      performance: performanceMetrics,
      period: {
        startDate: thirtyDaysAgo.toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        days: 30,
      },
    })
  } catch (error: any) {
    console.error('Get supplier analytics summary error:', error)

    return NextResponse.json(
      { error: 'Failed to fetch supplier analytics summary' },
      { status: 500 }
    )
  }
}

/**
 * Calculate on-time delivery rate from recent purchase orders
 */
function calculateOnTimeDeliveryRate(purchaseOrders: PurchaseOrder[]): number {
  const completedOrders = purchaseOrders.filter(
    po =>
      po.status === PurchaseOrderStatus.RECEIVED &&
      po.actualDeliveryDate &&
      po.expectedDeliveryDate
  )

  if (completedOrders.length === 0) {
    return 0
  }

  const onTimeOrders = completedOrders.filter(po => {
    const expectedDate = new Date(po.expectedDeliveryDate!)
    const actualDate = new Date(po.actualDeliveryDate!)
    return actualDate <= expectedDate
  })

  const rate = (onTimeOrders.length / completedOrders.length) * 100

  return Number(rate.toFixed(2))
}
