import { NextResponse } from 'next/server'
import {
  requireStoreAccess,
  requireRole,
  getUserIdFromHeaders,
} from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Sale, SaleStatus, PaymentMethod } from '@/lib/db/entities/sale.entity'
import { ShiftClose } from '@/lib/db/entities/shift-close.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId: paramStoreId } = await params
    const storeId = paramStoreId

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    // Only managers and admins can close shifts
    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    let userId = getUserIdFromHeaders(request)

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

    const body = await request.json()
    const { actualCash, notes, openingCash, shiftStartTime } = body

    if (typeof actualCash !== 'number' || actualCash < 0) {
      return NextResponse.json(
        { error: 'Invalid actual cash amount' },
        { status: 400 }
      )
    }

    const dataSource = await getDataSource()

    // Get all cash sales for the shift — use actual shiftStart time, not midnight
    const shiftStart = shiftStartTime ? new Date(shiftStartTime) : new Date()

    const shiftEnd = new Date()

    const cashSales = await dataSource
      .getRepository(Sale)
      .createQueryBuilder('sale')
      .where('sale.storeId = :storeId', { storeId })
      .andWhere('sale.paymentMethod = :method', { method: PaymentMethod.CASH })
      .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
      .andWhere('sale.createdAt >= :startDate', { startDate: shiftStart })
      .andWhere('sale.createdAt <= :endDate', { endDate: shiftEnd })
      .getMany()

    // Calculate expected cash
    const totalCashSales = cashSales.reduce((sum, sale) => sum + Number(sale.total), 0)
    const expectedCash = (openingCash || 0) + totalCashSales

    // Calculate variance
    const variance = actualCash - expectedCash

    // Create shift close record
    const shiftClose = dataSource.getRepository(ShiftClose).create({
      storeId,
      employeeId: userId,
      shiftStart,
      shiftEnd,
      openingCash: openingCash || 0,
      expectedCash,
      actualCash,
      variance,
      notes,
    })

    await dataSource.getRepository(ShiftClose).save(shiftClose)

    return NextResponse.json({
      id: shiftClose.id,
      openingCash: shiftClose.openingCash,
      totalCashSales,
      expectedCash,
      actualCash,
      variance,
      variancePercentage: expectedCash > 0 ? (variance / expectedCash) * 100 : 0,
      notes,
    })
  } catch (error) {
    console.error('Close shift error:', error)

    if (error instanceof Error) {
      if (error.message.includes('DENY')) {
        return NextResponse.json(
          { error: 'Permission denied' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to close shift' },
      { status: 500 }
    )
  }
}

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

    const dataSource = await getDataSource()

    // Get recent shift closes
    const shiftCloses = await dataSource
      .getRepository(ShiftClose)
      .createQueryBuilder('shift')
      .where('shift.storeId = :storeId', { storeId })
      .orderBy('shift.createdAt', 'DESC')
      .limit(10)
      .getMany()

    return NextResponse.json(shiftCloses)
  } catch (error) {
    console.error('Get shift closes error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shift closes' },
      { status: 500 }
    )
  }
}
