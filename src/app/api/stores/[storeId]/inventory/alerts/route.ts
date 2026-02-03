import { NextResponse } from 'next/server'
import { requireStoreAccess, getStoreIdFromHeaders } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Product } from '@/lib/db/entities/product.entity'

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

    const dataSource = await getDataSource()
    const productRepo = dataSource.getRepository(Product)

    // Get products with low stock
    const lowStock = await productRepo
      .createQueryBuilder('product')
      .where('product.storeId = :storeId', { storeId })
      .andWhere('product.currentStock <= product.minStockLevel')
      .andWhere('product.isActive = :isActive', { isActive: true })
      .andWhere('product.trackStock = :trackStock', { trackStock: true })
      .leftJoinAndSelect('product.category', 'category')
      .orderBy('product.currentStock', 'ASC')
      .getMany()

    // Get products with high stock (if maxStockLevel is set)
    const highStock = await productRepo
      .createQueryBuilder('product')
      .where('product.storeId = :storeId', { storeId })
      .andWhere('product.maxStockLevel IS NOT NULL')
      .andWhere('product.currentStock >= product.maxStockLevel')
      .andWhere('product.isActive = :isActive', { isActive: true })
      .andWhere('product.trackStock = :trackStock', { trackStock: true })
      .leftJoinAndSelect('product.category', 'category')
      .orderBy('product.currentStock', 'DESC')
      .getMany()

    // Get out of stock products
    const outOfStock = await productRepo
      .createQueryBuilder('product')
      .where('product.storeId = :storeId', { storeId })
      .andWhere('product.currentStock = 0')
      .andWhere('product.isActive = :isActive', { isActive: true })
      .andWhere('product.trackStock = :trackStock', { trackStock: true })
      .leftJoinAndSelect('product.category', 'category')
      .orderBy('product.name', 'ASC')
      .getMany()

    return NextResponse.json({
      lowStock,
      highStock,
      outOfStock,
      summary: {
        lowStockCount: lowStock.length,
        highStockCount: highStock.length,
        outOfStockCount: outOfStock.length,
      },
    })
  } catch (error) {
    console.error('Get alerts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}
