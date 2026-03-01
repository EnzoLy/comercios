import { NextResponse } from 'next/server'
import { requireStoreAccess, getStoreIdFromHeaders } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { getAnalyticsOverview } from '@/lib/db/queries/analytics'
import { analyticsQuerySchema } from '@/lib/validations/analytics.schema'

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

    // Use defaults if not provided (last 30 days)
    let finalStartDate = startDate
    let finalEndDate = endDate

    if (!startDate || !endDate) {
      const now = new Date()
      finalEndDate = now.toISOString().split('T')[0]
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      finalStartDate = thirtyDaysAgo.toISOString().split('T')[0]
    }

    const validationResult = analyticsQuerySchema.safeParse({
      startDate: finalStartDate,
      endDate: finalEndDate,
    })

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const dataSource = await getDataSource()
    const startDateObj = new Date(finalStartDate!)
    const endDateObj = new Date(finalEndDate!)

    // Set start date to beginning of day and end date to end of day
    startDateObj.setHours(0, 0, 0, 0)
    endDateObj.setHours(23, 59, 59, 999)

    const analyticsParams = { startDate: startDateObj, endDate: endDateObj }
    const overview = await getAnalyticsOverview(dataSource, storeId, analyticsParams)

    return NextResponse.json({
      data: overview,
      meta: {
        startDate: finalStartDate,
        endDate: finalEndDate,
      },
    })
  } catch (error) {
    console.error('Analytics error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
