import { NextResponse } from 'next/server'
import { requireStoreAccess } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { SupplierProductPrice } from '@/lib/db/entities/supplier-product-price.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { priceTrendsQuerySchema } from '@/lib/validations/supplier-product-price.schema'
import { In, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm'

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

    // Parse array parameters
    const productIdsParam = searchParams.get('productIds')
    const supplierIdsParam = searchParams.get('supplierIds')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!productIdsParam || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'productIds, startDate, and endDate are required' },
        { status: 400 }
      )
    }

    const productIds = productIdsParam.split(',')
    const supplierIds = supplierIdsParam ? supplierIdsParam.split(',') : undefined

    // Validate the query parameters
    const validated = priceTrendsQuerySchema.parse({
      productIds,
      supplierIds,
      startDate,
      endDate,
    })

    const dataSource = await getDataSource()
    const productRepo = dataSource.getRepository(Product)
    const priceRepo = dataSource.getRepository(SupplierProductPrice)
    const supplierRepo = dataSource.getRepository(Supplier)

    // Step 1: Get products
    const products = await productRepo.find({
      where: {
        id: In(validated.productIds),
        storeId,
      },
    })

    if (products.length === 0) {
      return NextResponse.json({ products: [] })
    }

    const productMap = new Map(products.map(p => [p.id, p]))

    // Step 2: Build price query
    let priceQuery = priceRepo
      .createQueryBuilder('price')
      .where('price.storeId = :storeId', { storeId })
      .andWhere('price.productId IN (:...productIds)', { productIds: validated.productIds })
      .andWhere('price.effectiveDate >= :startDate', { startDate: validated.startDate })
      .andWhere('price.effectiveDate <= :endDate', { endDate: validated.endDate })

    // Apply supplier filter if provided
    if (validated.supplierIds && validated.supplierIds.length > 0) {
      priceQuery = priceQuery.andWhere('price.supplierId IN (:...supplierIds)', {
        supplierIds: validated.supplierIds,
      })
    }

    priceQuery = priceQuery
      .leftJoinAndSelect('price.supplier', 'supplier')
      .orderBy('price.effectiveDate', 'ASC')

    const priceHistory = await priceQuery.getMany()

    // Step 3: Get unique suppliers from results
    const uniqueSupplierIds = [...new Set(priceHistory.map(p => p.supplierId))]
    const suppliers = await supplierRepo.find({
      where: {
        id: In(uniqueSupplierIds),
        storeId,
      },
    })

    const supplierMap = new Map(suppliers.map(s => [s.id, s]))

    // Step 4: Group by product and analyze trends
    const productTrends = new Map<string, any>()

    for (const product of products) {
      const productPrices = priceHistory.filter(p => p.productId === product.id)

      if (productPrices.length === 0) {
        continue
      }

      // Group by supplier
      const supplierData = new Map<string, any>()

      for (const price of productPrices) {
        if (!supplierData.has(price.supplierId)) {
          const supplier = supplierMap.get(price.supplierId)
          supplierData.set(price.supplierId, {
            supplierId: price.supplierId,
            supplierName: supplier?.name || 'Unknown',
            currency: price.currency,
            prices: [],
          })
        }

        supplierData.get(price.supplierId)!.prices.push({
          date: price.effectiveDate,
          price: Number(price.price),
          changePercentage: price.changePercentage ? Number(price.changePercentage) : null,
          hasAlert: price.hasAlert,
        })
      }

      // Calculate trend for each supplier
      const suppliersWithTrends = Array.from(supplierData.values()).map(supplierInfo => {
        const prices = supplierInfo.prices
        const trend = analyzeTrend(prices)

        return {
          ...supplierInfo,
          trend,
        }
      })

      productTrends.set(product.id, {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        suppliers: suppliersWithTrends,
      })
    }

    const result = Array.from(productTrends.values())

    return NextResponse.json({ products: result })
  } catch (error: any) {
    console.error('Price trends error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch price trends' },
      { status: 500 }
    )
  }
}

/**
 * Analyze price trend based on price history
 */
function analyzeTrend(prices: Array<{ date: Date; price: number }>): {
  direction: 'rising' | 'falling' | 'stable'
  averageChange: number
  minPrice: number
  maxPrice: number
  currentPrice: number
  pricePoints: number
} {
  if (prices.length === 0) {
    return {
      direction: 'stable',
      averageChange: 0,
      minPrice: 0,
      maxPrice: 0,
      currentPrice: 0,
      pricePoints: 0,
    }
  }

  if (prices.length === 1) {
    return {
      direction: 'stable',
      averageChange: 0,
      minPrice: prices[0].price,
      maxPrice: prices[0].price,
      currentPrice: prices[0].price,
      pricePoints: 1,
    }
  }

  const priceValues = prices.map(p => p.price)
  const minPrice = Math.min(...priceValues)
  const maxPrice = Math.max(...priceValues)
  const currentPrice = priceValues[priceValues.length - 1]
  const firstPrice = priceValues[0]

  // Calculate average change between consecutive prices
  let totalChange = 0
  let changeCount = 0

  for (let i = 1; i < priceValues.length; i++) {
    const change = ((priceValues[i] - priceValues[i - 1]) / priceValues[i - 1]) * 100
    totalChange += change
    changeCount++
  }

  const averageChange = changeCount > 0 ? totalChange / changeCount : 0

  // Determine overall trend
  const overallChange = ((currentPrice - firstPrice) / firstPrice) * 100
  let direction: 'rising' | 'falling' | 'stable'

  if (overallChange > 2) {
    direction = 'rising'
  } else if (overallChange < -2) {
    direction = 'falling'
  } else {
    direction = 'stable'
  }

  return {
    direction,
    averageChange: Number(averageChange.toFixed(2)),
    minPrice,
    maxPrice,
    currentPrice,
    pricePoints: prices.length,
  }
}
