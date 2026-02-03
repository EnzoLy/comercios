import { NextResponse } from 'next/server'
import {
  requireStoreAccess,
  getUserIdFromHeaders,
} from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Sale, SaleStatus } from '@/lib/db/entities/sale.entity'

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

    const dataSource = await getDataSource()

    // Get last 10 completed sales by this employee
    const sales = await dataSource
      .getRepository(Sale)
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.items', 'items')
      .where('sale.storeId = :storeId', { storeId })
      .andWhere('sale.cashierId = :userId', { userId })
      .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
      .orderBy('sale.createdAt', 'DESC')
      .limit(10)
      .getMany()

    // Transform to response format
    const response = sales.map((sale) => ({
      id: sale.id,
      createdAt: sale.createdAt,
      total: Number(sale.total),
      itemCount: sale.items?.length || 0,
      items: sale.items?.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount || 0),
      })) || [],
    }))

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get recent sales error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent sales' },
      { status: 500 }
    )
  }
}
