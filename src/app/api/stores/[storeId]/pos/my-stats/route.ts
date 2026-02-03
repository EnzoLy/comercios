import { NextResponse } from 'next/server'
import {
  requireStoreAccess,
  getUserIdFromHeaders,
  validateActiveUser,
} from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Sale, SaleStatus } from '@/lib/db/entities/sale.entity'
import { SaleItem } from '@/lib/db/entities/sale-item.entity'

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

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'today'

    // Check if there's an activeUserId override (for multi-user PC scenario)
    const activeUserId = searchParams.get('activeUserId')

    // Validate activeUserId against database - throws ForbiddenError if invalid
    const filterUserId = await validateActiveUser(activeUserId, userId, storeId)

    const dataSource = await getDataSource()

    // Calculate date range
    let startDate = new Date()
    startDate.setHours(0, 0, 0, 0)

    let endDate = new Date()
    endDate.setHours(23, 59, 59, 999)

    // Get employee's sales for the period
    const employeeSales = await dataSource
      .getRepository(Sale)
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.items', 'items')
      .where('sale.storeId = :storeId', { storeId })
      .andWhere('sale.cashierId = :userId', { userId: filterUserId })
      .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
      .andWhere('sale.createdAt >= :startDate', { startDate })
      .andWhere('sale.createdAt <= :endDate', { endDate })
      .getMany()

    // Calculate stats
    const totalSales = employeeSales.length
    const totalRevenue = employeeSales.reduce((sum, sale) => sum + Number(sale.total), 0)
    const averageTransaction = totalSales > 0 ? totalRevenue / totalSales : 0

    // Get top product
    const topProduct = await dataSource
      .getRepository(SaleItem)
      .createQueryBuilder('saleItem')
      .select('saleItem.productName', 'productName')
      .addSelect('SUM(saleItem.quantity)', 'totalQuantity')
      .innerJoin('saleItem.sale', 'sale')
      .where('sale.storeId = :storeId', { storeId })
      .andWhere('sale.cashierId = :userId', { userId: filterUserId })
      .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
      .andWhere('sale.createdAt >= :startDate', { startDate })
      .andWhere('sale.createdAt <= :endDate', { endDate })
      .groupBy('saleItem.productName')
      .orderBy('SUM(saleItem.quantity)', 'DESC')
      .limit(1)
      .getRawOne()

    // Get store average (all employees' sales)
    const allSales = await dataSource
      .getRepository(Sale)
      .createQueryBuilder('sale')
      .where('sale.storeId = :storeId', { storeId })
      .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
      .andWhere('sale.createdAt >= :startDate', { startDate })
      .andWhere('sale.createdAt <= :endDate', { endDate })
      .getMany()

    const storeAverageTransaction = allSales.length > 0
      ? allSales.reduce((sum, sale) => sum + Number(sale.total), 0) / allSales.length
      : 0

    // Calculate ranking
    const employeeSalesMap = new Map<string, number>()
    for (const sale of allSales) {
      const current = employeeSalesMap.get(sale.cashierId) || 0
      employeeSalesMap.set(sale.cashierId, current + Number(sale.total))
    }

    const sortedEmployees = Array.from(employeeSalesMap.entries())
      .sort((a, b) => b[1] - a[1])

    const employeeRank = sortedEmployees.findIndex((e) => e[0] === filterUserId) + 1
    const totalEmployees = sortedEmployees.length

    return NextResponse.json({
      period,
      totalSales,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageTransaction: Math.round(averageTransaction * 100) / 100,
      storeAverageTransaction: Math.round(storeAverageTransaction * 100) / 100,
      topProduct: topProduct ? {
        name: topProduct.productName,
        quantity: Number(topProduct.totalQuantity),
      } : null,
      ranking: {
        rank: employeeRank,
        total: totalEmployees,
      },
      isAboveAverage: averageTransaction > storeAverageTransaction,
    })
  } catch (error) {
    console.error('Get my stats error:', error)

    // Handle authorization errors
    if (error instanceof Error && error.name === 'ForbiddenError') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
