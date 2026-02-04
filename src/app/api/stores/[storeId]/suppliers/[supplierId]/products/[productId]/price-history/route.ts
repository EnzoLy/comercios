import { NextResponse } from 'next/server'
import { requireStoreAccess } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { SupplierProduct } from '@/lib/db/entities/supplier-product.entity'
import { SupplierProductPrice } from '@/lib/db/entities/supplier-product-price.entity'
import { z } from 'zod'

// Query schema for filtering price history
const priceHistoryQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
})

export async function GET(
  request: Request,
  {
    params,
  }: { params: Promise<{ storeId: string; supplierId: string; productId: string }> }
) {
  try {
    const { storeId, supplierId, productId } = await params

    if (!storeId || !supplierId || !productId) {
      return NextResponse.json(
        { error: 'Store ID, Supplier ID, and Product ID required' },
        { status: 400 }
      )
    }

    await requireStoreAccess(storeId)

    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const validated = priceHistoryQuerySchema.parse(queryParams)

    const dataSource = await getDataSource()
    const supplierProductRepo = dataSource.getRepository(SupplierProduct)
    const priceRepo = dataSource.getRepository(SupplierProductPrice)

    // Verify the product is associated with this supplier
    const supplierProduct = await supplierProductRepo.findOne({
      where: { supplierId, productId, storeId },
      relations: ['product'],
    })

    if (!supplierProduct) {
      return NextResponse.json(
        { error: 'Product not associated with this supplier' },
        { status: 404 }
      )
    }

    // Build query for price history
    let query = priceRepo
      .createQueryBuilder('price')
      .where('price.supplierId = :supplierId', { supplierId })
      .andWhere('price.productId = :productId', { productId })
      .andWhere('price.storeId = :storeId', { storeId })

    // Apply date filters
    if (validated.startDate) {
      query = query.andWhere('price.effectiveDate >= :startDate', {
        startDate: validated.startDate,
      })
    }

    if (validated.endDate) {
      query = query.andWhere('price.effectiveDate <= :endDate', {
        endDate: validated.endDate,
      })
    }

    // Order by effective date (most recent first)
    query = query
      .orderBy('price.effectiveDate', 'DESC')
      .take(validated.limit)

    const priceHistory = await query.getMany()

    // Enhance with price change indicators
    const enrichedHistory = priceHistory.map((price, index) => {
      const nextPrice = priceHistory[index + 1] // Next item in DESC order is the previous price

      let priceChange = null
      let priceChangePercent = null
      let isSignificantIncrease = false
      let isMajorIncrease = false

      if (nextPrice) {
        const currentPrice = Number(price.price)
        const previousPrice = Number(nextPrice.price)
        priceChange = currentPrice - previousPrice
        priceChangePercent = (priceChange / previousPrice) * 100

        // Highlight price increases
        if (priceChangePercent > 5) {
          isSignificantIncrease = true
        }
        if (priceChangePercent > 10) {
          isMajorIncrease = true
        }
      }

      return {
        ...price,
        priceChange,
        priceChangePercent,
        isSignificantIncrease,
        isMajorIncrease,
      }
    })

    // Calculate statistics
    const prices = priceHistory.map((p) => Number(p.price))
    const statistics = {
      currentPrice: prices.length > 0 ? prices[0] : null,
      lowestPrice: prices.length > 0 ? Math.min(...prices) : null,
      highestPrice: prices.length > 0 ? Math.max(...prices) : null,
      averagePrice:
        prices.length > 0
          ? prices.reduce((sum, price) => sum + price, 0) / prices.length
          : null,
      totalPriceChanges: priceHistory.length,
      priceIncreases: enrichedHistory.filter((p) => p.isSignificantIncrease).length,
      majorPriceIncreases: enrichedHistory.filter((p) => p.isMajorIncrease).length,
    }

    return NextResponse.json({
      product: {
        id: supplierProduct.product.id,
        name: supplierProduct.product.name,
        sku: supplierProduct.product.sku,
        supplierSku: supplierProduct.supplierSku,
      },
      statistics,
      history: enrichedHistory,
    })
  } catch (error: any) {
    console.error('Get price history error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch price history' },
      { status: 500 }
    )
  }
}
