import { NextResponse } from 'next/server'
import {
  requireStoreAccess,
  getUserIdFromHeaders,
  validateActiveUser,
} from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Sale } from '@/lib/db/entities/sale.entity'
import { SaleItem } from '@/lib/db/entities/sale-item.entity'
import { Product } from '@/lib/db/entities/product.entity'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId: paramStoreId } = await params
    const storeId = paramStoreId

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    await requireStoreAccess(storeId)

    let userId = getUserIdFromHeaders(request)

    // Fallback: if userId is missing from headers, try to get it from session
    if (!userId) {
      const { auth } = await import('@/lib/auth/auth')
      const session = await auth()
      userId = session?.user?.id || null
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Check if there's an activeUserId override (for multi-user PC scenario)
    const url = new URL(request.url)
    const activeUserId = url.searchParams.get('activeUserId')

    // Validate activeUserId against database - throws ForbiddenError if invalid
    const filterUserId = await validateActiveUser(activeUserId, userId, storeId)

    const dataSource = await getDataSource()

    // Get top 10 products sold by this employee in the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const favorites = await dataSource
      .getRepository(SaleItem)
      .createQueryBuilder('saleItem')
      .select('saleItem.productId', 'productId')
      .addSelect('saleItem.productName', 'productName')
      .addSelect('saleItem.productSku', 'productSku')
      .addSelect('saleItem.unitPrice', 'price')
      .addSelect('SUM(saleItem.quantity)', 'quantitySold')
      .innerJoin(Sale, 'sale', 'sale.id = saleItem.saleId')
      .where('sale.storeId = :storeId', { storeId })
      .andWhere('sale.cashierId = :userId', { userId: filterUserId })
      .andWhere('sale.createdAt >= :startDate', { startDate: thirtyDaysAgo })
      .groupBy('saleItem.productId')
      .addGroupBy('saleItem.productName')
      .addGroupBy('saleItem.productSku')
      .addGroupBy('saleItem.unitPrice')
      .orderBy('SUM(saleItem.quantity)', 'DESC')
      .limit(10)
      .getRawMany()

    // Fetch full product details including stock
    const productIds = favorites.map((f: any) => f.productId)
    const products = await dataSource
      .getRepository(Product)
      .createQueryBuilder('product')
      .where('product.id IN (:...productIds)', { productIds })
      .select(['product.id', 'product.name', 'product.sku', 'product.sellingPrice', 'product.currentStock', 'product.imageUrl'])
      .getMany()

    const result = favorites.map((fav: any) => {
      const product = products.find((p) => p.id === fav.productId)
      return {
        productId: fav.productId,
        name: fav.productName,
        sku: fav.productSku,
        price: Number(fav.price),
        quantitySold: Number(fav.quantitySold),
        currentStock: product?.currentStock || 0,
        imageUrl: product?.imageUrl || null,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Get favorites error:', error)

    // Handle authorization errors
    if (error instanceof Error && error.name === 'ForbiddenError') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
      { status: 500 }
    )
  }
}
