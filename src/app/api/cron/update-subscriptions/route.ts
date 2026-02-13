import { NextResponse } from 'next/server'
import { updateAllSubscriptionStatuses, getSubscriptionAlerts } from '@/lib/cron/update-subscription-status'

/**
 * Cron endpoint to update subscription statuses
 * Should be called daily by external cron service (e.g., Vercel Cron, GitHub Actions)
 *
 * Authorization: Bearer <CRON_SECRET>
 *
 * Example curl:
 * curl -X GET https://your-domain.com/api/cron/update-subscriptions \
 *   -H "Authorization: Bearer your-cron-secret"
 */
export async function GET(request: Request) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token || token !== process.env.CRON_SECRET) {
      console.error('[Cron API] Unauthorized access attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const startTime = Date.now()
    console.log('[Cron API] Starting subscription status update')

    // Update all subscription statuses
    const results = await updateAllSubscriptionStatuses()

    // Get alerts for stores requiring attention
    const alerts = await getSubscriptionAlerts()

    const duration = Date.now() - startTime

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      results,
      alerts,
    }

    console.log('[Cron API] Subscription update completed successfully:', response)

    return NextResponse.json(response, { status: 200 })
  } catch (error: any) {
    console.error('[Cron API] Failed to update subscriptions:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update subscriptions',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Also support POST for flexibility with different cron services
export async function POST(request: Request) {
  return GET(request)
}
