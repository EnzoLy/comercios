import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { SupplierProduct } from '@/lib/db/entities/supplier-product.entity'
import { SupplierProductPrice } from '@/lib/db/entities/supplier-product-price.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { createSupplierProductPriceSchema } from '@/lib/validations/supplier-product-price.schema'
import { IsNull } from 'typeorm'

export async function POST(
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

    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const body = await request.json()
    const validated = createSupplierProductPriceSchema.parse(body)

    const dataSource = await getDataSource()
    const supplierProductRepo = dataSource.getRepository(SupplierProduct)
    const priceRepo = dataSource.getRepository(SupplierProductPrice)

    // Verify the product is associated with this supplier
    const supplierProduct = await supplierProductRepo.findOne({
      where: { supplierId, productId, storeId },
    })

    if (!supplierProduct) {
      return NextResponse.json(
        { error: 'Product not associated with this supplier' },
        { status: 404 }
      )
    }

    // Get current price (where endDate is NULL)
    const currentPrice = await priceRepo.findOne({
      where: {
        supplierId,
        productId,
        storeId,
        endDate: IsNull(),
      },
      order: { effectiveDate: 'DESC' },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0) // Normalize to start of day

    const effectiveDate = validated.effectiveDate
      ? new Date(validated.effectiveDate)
      : today

    let changePercentage: number | null = null
    let hasAlert = false

    // If there's a current price, calculate change and update its endDate
    if (currentPrice) {
      // Calculate percentage change
      const priceDifference = validated.price - Number(currentPrice.price)
      changePercentage = (priceDifference / Number(currentPrice.price)) * 100

      // Set alert flag if price increased by more than 5%
      if (changePercentage > 5) {
        hasAlert = true
      }

      // Set endDate on current price to today
      currentPrice.endDate = today
      await priceRepo.save(currentPrice)

      // Update last purchase price on supplier product
      supplierProduct.lastPurchasePrice = Number(currentPrice.price)
      supplierProduct.lastPurchaseDate = currentPrice.effectiveDate
      await supplierProductRepo.save(supplierProduct)
    }

    // Create new price record
    const newPrice = priceRepo.create({
      supplierId,
      productId,
      storeId,
      price: validated.price,
      currency: validated.currency || 'USD',
      effectiveDate,
      endDate: undefined, // This is now the current price
      sku: validated.sku || supplierProduct.supplierSku,
      minimumOrderQuantity: validated.minimumOrderQuantity,
      packSize: validated.packSize,
      hasAlert,
      changePercentage: changePercentage !== null ? changePercentage : undefined,
    })

    await priceRepo.save(newPrice)

    return NextResponse.json(
      {
        ...newPrice,
        previousPrice: currentPrice
          ? {
            price: currentPrice.price,
            effectiveDate: currentPrice.effectiveDate,
            endDate: currentPrice.endDate,
          }
          : null,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Create supplier product price error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create price record' },
      { status: 500 }
    )
  }
}
