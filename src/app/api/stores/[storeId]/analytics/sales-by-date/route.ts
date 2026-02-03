import { NextResponse } from 'next/server'
import { requireStoreAccess, getStoreIdFromHeaders } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { getDailySales, getMonthlySales } from '@/lib/db/queries/analytics'
import { analyticsQuerySchema, type DailySalesQuery } from '@/lib/validations/analytics.schema'
import { SaleStatus } from '@/lib/db/entities/sale.entity'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId: paramStoreId } = await params
    const headerStoreId = getStoreIdFromHeaders(request)
    const storeId = headerStoreId || paramStoreId

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    await requireStoreAccess(storeId)

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const granularity = searchParams.get('granularity') || 'day'

    // Validate input
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const validationResult = analyticsQuerySchema.safeParse({
      startDate,
      endDate,
      granularity,
    })

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const dataSource = await getDataSource()
    const startDateObj = new Date(startDate)
    const endDateObj = new Date(endDate)

    // Set start date to beginning of day and end date to end of day
    startDateObj.setHours(0, 0, 0, 0)
    endDateObj.setHours(23, 59, 59, 999)

    const analyticsParams = { startDate: startDateObj, endDate: endDateObj }

    // Get the appropriate data
    const data =
      granularity === 'month'
        ? await getMonthlySales(dataSource, storeId, analyticsParams)
        : await getDailySales(dataSource, storeId, analyticsParams)

    // Calculate summary
    const totalRevenue = data.reduce((sum, d) => sum + parseFloat(d.revenue), 0)
    const totalTransactions = data.reduce((sum, d) => sum + d.transactions, 0)
    const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

    return NextResponse.json({
      data,
      meta: {
        startDate,
        endDate,
        totalRecords: data.length,
        granularity,
      },
      summary: {
        totalRevenue: totalRevenue.toFixed(2),
        totalTransactions,
        avgTransaction: avgTransaction.toFixed(2),
      },
    })
  } catch (error) {
    console.error('Analytics error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
