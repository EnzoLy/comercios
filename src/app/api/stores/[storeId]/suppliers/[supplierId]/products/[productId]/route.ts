import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { SupplierProduct } from '@/lib/db/entities/supplier-product.entity'
import { SupplierProductPrice } from '@/lib/db/entities/supplier-product-price.entity'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { IsNull } from 'typeorm'

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

    const dataSource = await getDataSource()
    const supplierProductRepo = dataSource.getRepository(SupplierProduct)

    // Get supplier-product association with product details
    const supplierProduct = await supplierProductRepo.findOne({
      where: { supplierId, productId, storeId },
      relations: ['product', 'product.category'],
    })

    if (!supplierProduct) {
      return NextResponse.json(
        { error: 'Product not associated with this supplier' },
        { status: 404 }
      )
    }

    // Get current price
    const priceRepo = dataSource.getRepository(SupplierProductPrice)
    const currentPrice = await priceRepo.findOne({
      where: {
        supplierId,
        productId,
        storeId,
        endDate: IsNull(),
      },
      order: { effectiveDate: 'DESC' },
    })

    return NextResponse.json({
      ...supplierProduct,
      currentPrice,
    })
  } catch (error) {
    console.error('Get supplier product error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch supplier product' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const dataSource = await getDataSource()
    const supplierProductRepo = dataSource.getRepository(SupplierProduct)

    // Find the supplier-product association
    const supplierProduct = await supplierProductRepo.findOne({
      where: { supplierId, productId, storeId },
    })

    if (!supplierProduct) {
      return NextResponse.json(
        { error: 'Product not associated with this supplier' },
        { status: 404 }
      )
    }

    // Delete the association (CASCADE will handle related price records)
    await supplierProductRepo.remove(supplierProduct)

    return NextResponse.json({
      success: true,
      message: 'Product removed from supplier successfully',
    })
  } catch (error) {
    console.error('Delete supplier product error:', error)
    return NextResponse.json(
      { error: 'Failed to remove product from supplier' },
      { status: 500 }
    )
  }
}
