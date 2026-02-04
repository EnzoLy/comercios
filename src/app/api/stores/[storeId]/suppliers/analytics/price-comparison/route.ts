import { NextResponse } from 'next/server'
import { requireStoreAccess } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { SupplierProductPrice } from '@/lib/db/entities/supplier-product-price.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { SupplierProduct } from '@/lib/db/entities/supplier-product.entity'
import { priceComparisonQuerySchema } from '@/lib/validations/supplier-product-price.schema'
import { In, IsNull } from 'typeorm'

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
    const supplierIdsParam = searchParams.get('supplierIds')
    const productIdsParam = searchParams.get('productIds')
    const categoryId = searchParams.get('categoryId')

    if (!supplierIdsParam) {
      return NextResponse.json(
        { error: 'supplierIds parameter is required' },
        { status: 400 }
      )
    }

    const supplierIds = supplierIdsParam.split(',')
    const productIds = productIdsParam ? productIdsParam.split(',') : undefined

    // Validate the query parameters
    const validated = priceComparisonQuerySchema.parse({
      supplierIds,
      productIds,
      categoryId,
    })

    const dataSource = await getDataSource()
    const productRepo = dataSource.getRepository(Product)
    const priceRepo = dataSource.getRepository(SupplierProductPrice)
    const supplierRepo = dataSource.getRepository(Supplier)
    const supplierProductRepo = dataSource.getRepository(SupplierProduct)

    // Step 1: Get products to compare
    let productsQuery = productRepo
      .createQueryBuilder('product')
      .where('product.storeId = :storeId', { storeId })
      .andWhere('product.isActive = :isActive', { isActive: true })

    if (validated.productIds) {
      productsQuery = productsQuery.andWhere('product.id IN (:...productIds)', {
        productIds: validated.productIds,
      })
    } else if (validated.categoryId) {
      productsQuery = productsQuery.andWhere('product.categoryId = :categoryId', {
        categoryId: validated.categoryId,
      })
    } else {
      // If no filters, get products that have at least one supplier from the list
      const supplierProducts = await supplierProductRepo.find({
        where: {
          storeId,
          supplierId: In(validated.supplierIds),
          isActive: true,
        },
        select: ['productId'],
      })

      const productIdsFromSuppliers = [...new Set(supplierProducts.map(sp => sp.productId))]

      if (productIdsFromSuppliers.length === 0) {
        return NextResponse.json({ products: [] })
      }

      productsQuery = productsQuery.andWhere('product.id IN (:...productIds)', {
        productIds: productIdsFromSuppliers,
      })
    }

    const products = await productsQuery.getMany()

    if (products.length === 0) {
      return NextResponse.json({ products: [] })
    }

    // Step 2: Get suppliers info
    const suppliers = await supplierRepo.find({
      where: {
        id: In(validated.supplierIds),
        storeId,
      },
    })

    const supplierMap = new Map(suppliers.map(s => [s.id, s]))


    // Step 3: Get current prices for all products from all suppliers
    const currentPrices = await priceRepo.find({
      where: {
        storeId,
        supplierId: In(validated.supplierIds),
        productId: In(products.map(p => p.id)),
        endDate: IsNull(), // Current price
      },
    })

    // Step 4: Build the comparison data
    const priceMap = new Map<string, Map<string, SupplierProductPrice>>()

    for (const price of currentPrices) {
      if (!priceMap.has(price.productId)) {
        priceMap.set(price.productId, new Map())
      }
      priceMap.get(price.productId)!.set(price.supplierId, price)
    }

    // Step 5: Format the response
    const result = products.map(product => {
      const productPrices = priceMap.get(product.id)

      if (!productPrices || productPrices.size === 0) {
        return {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          prices: [],
        }
      }

      // Convert to array and find the best price
      const pricesArray = Array.from(productPrices.entries()).map(([supplierId, priceData]) => {
        const supplier = supplierMap.get(supplierId)
        return {
          supplierId,
          supplierName: supplier?.name || 'Unknown',
          price: Number(priceData.price),
          currency: priceData.currency,
          sku: priceData.sku,
          minimumOrderQuantity: priceData.minimumOrderQuantity,
          packSize: priceData.packSize,
        }
      })

      // Find the best (lowest) price
      const bestPrice = Math.min(...pricesArray.map(p => p.price))

      // Calculate differences from best price
      const enrichedPrices = pricesArray.map(price => {
        const isBest = price.price === bestPrice
        const priceDifference = isBest ? 0 : price.price - bestPrice
        const priceDifferencePercent = isBest
          ? 0
          : ((priceDifference / bestPrice) * 100)

        return {
          ...price,
          isBest,
          priceDifference: isBest ? undefined : Number(priceDifference.toFixed(2)),
          priceDifferencePercent: isBest ? undefined : Number(priceDifferencePercent.toFixed(2)),
        }
      })

      // Sort by price (best first)
      enrichedPrices.sort((a, b) => a.price - b.price)

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        prices: enrichedPrices,
      }
    })

    // Filter out products with no prices
    const productsWithPrices = result.filter(p => p.prices.length > 0)

    return NextResponse.json({ products: productsWithPrices })
  } catch (error: any) {
    console.error('Price comparison error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch price comparison' },
      { status: 500 }
    )
  }
}
