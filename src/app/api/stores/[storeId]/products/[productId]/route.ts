import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Product } from '@/lib/db/entities/product.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { updateProductSchema } from '@/lib/validations/product.schema'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string; productId: string }> }
) {
  try {
    const { storeId, productId } = await params
    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const productRepo = dataSource.getRepository(Product)

    const product = await productRepo.findOne({
      where: { id: productId, storeId },
      relations: ['category', 'supplier'],
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Get product error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string; productId: string }> }
) {
  try {
    const { storeId, productId } = await params
    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const body = await request.json()
    const validated = updateProductSchema.parse(body)

    const dataSource = await getDataSource()
    const productRepo = dataSource.getRepository(Product)

    const product = await productRepo.findOne({
      where: { id: productId, storeId },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Build update data, converting empty strings to null and removing undefined values
    const updateData: any = {}

    for (const [key, value] of Object.entries(validated)) {
      if (value === undefined) continue
      if (value === '') {
        updateData[key] = null
      } else {
        updateData[key] = value
      }
    }

    // Check for duplicate SKU or barcode if updating
    if (validated.sku && validated.sku !== product.sku) {
      const existingSku = await productRepo.findOne({
        where: { storeId, sku: validated.sku },
      })
      if (existingSku && existingSku.id !== productId) {
        return NextResponse.json(
          { error: 'SKU already exists' },
          { status: 400 }
        )
      }
    }

    if (updateData.barcode && updateData.barcode !== product.barcode) {
      const existingBarcode = await productRepo.findOne({
        where: { storeId, barcode: updateData.barcode },
      })
      if (existingBarcode && existingBarcode.id !== productId) {
        return NextResponse.json(
          { error: 'Barcode already exists' },
          { status: 400 }
        )
      }
    }

    await productRepo.update({ id: productId }, updateData)

    const updated = await productRepo.findOne({
      where: { id: productId },
      relations: ['category', 'supplier'],
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update product error:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ storeId: string; productId: string }> }
) {
  try {
    const { storeId, productId } = await params
    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const dataSource = await getDataSource()
    const productRepo = dataSource.getRepository(Product)
    const saleItemRepo = dataSource.getRepository('SaleItem')

    const product = await productRepo.findOne({
      where: { id: productId, storeId },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Check if product is referenced in any sales
    const saleItemCount = await saleItemRepo
      .createQueryBuilder('saleItem')
      .where('saleItem.productId = :productId', { productId })
      .getCount()

    if (saleItemCount > 0) {
      // Product has sales history - use soft delete
      await productRepo.update({ id: productId }, { isActive: false })
      return NextResponse.json({
        message: 'Product deactivated (preserved in sales history)',
        preserved: true,
        saleCount: saleItemCount
      })
    }

    // No sales history - safe to hard delete
    await productRepo.delete({ id: productId })

    return NextResponse.json({
      message: 'Product deleted successfully',
      preserved: false
    })
  } catch (error) {
    console.error('Delete product error:', error)

    // If foreign key constraint error, fallback to soft delete
    if (error instanceof Error && error.message.includes('foreign key constraint')) {
      try {
        const { productId } = await params
        const dataSource = await getDataSource()
        const productRepo = dataSource.getRepository(Product)

        await productRepo.update({ id: productId }, { isActive: false })

        return NextResponse.json({
          message: 'Product deactivated due to existing references',
          preserved: true
        })
      } catch (fallbackError) {
        console.error('Fallback soft delete also failed:', fallbackError)
        return NextResponse.json(
          { error: 'Failed to delete product - it is referenced in sales' },
          { status: 409 } // 409 Conflict
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}

// Restore a deactivated product
export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string; productId: string }> }
) {
  try {
    const { storeId, productId } = await params
    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const { action } = await request.json()

    if (action !== 'restore') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const dataSource = await getDataSource()
    const productRepo = dataSource.getRepository(Product)

    const product = await productRepo.findOne({
      where: { id: productId, storeId },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Reactivate the product
    await productRepo.update({ id: productId }, { isActive: true })

    const restored = await productRepo.findOne({
      where: { id: productId },
      relations: ['category', 'supplier'],
    })

    return NextResponse.json({
      message: 'Product reactivated successfully',
      product: restored
    })
  } catch (error) {
    console.error('Restore product error:', error)
    return NextResponse.json(
      { error: 'Failed to restore product' },
      { status: 500 }
    )
  }
}
