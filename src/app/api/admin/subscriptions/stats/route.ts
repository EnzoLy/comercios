import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/permissions'
import { SubscriptionService } from '@/lib/services/subscription.service'

export async function GET(request: Request) {
  try {
    await requireSuperAdmin()

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const stats = await SubscriptionService.getSubscriptionStats(includeInactive)

    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('Get subscription stats error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscription stats' },
      { status: 500 }
    )
  }
}
