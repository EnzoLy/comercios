import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/db'
import { Store } from '@/lib/db/entities/store.entity'
import { User } from '@/lib/db/entities/user.entity'
import { SubscriptionService } from '@/lib/services/subscription.service'
import { buildCheckoutUrl } from '@/lib/services/lemonsqueezy.service'
import { requireAuth } from '@/lib/auth/permissions'

export async function GET(request: NextRequest, { params }: { params: Promise<{ storeId: string }> }) {

  const { storeId } = await params
  const session = await requireAuth()
  const userId = session.user.id

  if (!storeId) {
    return NextResponse.json({ error: 'Missing store context' }, { status: 400 })
  }

  const storeRepo = await getRepository(Store)
  const store = await storeRepo.findOne({
    where: { id: storeId },
    select: [
      'id',
      'slug',
      'subscriptionPlan',
      'subscriptionStatus',
      'subscriptionEndDate',
      'isPermanent',
      'lemonSqueezyCustomerId',
    ],
  })

  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }

  const daysRemaining = SubscriptionService.calculateDaysRemaining(store.subscriptionEndDate)

  // Build checkout URL for upgrade/renewal if needed
  let checkoutUrl: string | null = null

  if (userId) {
    try {
      const user = session.user
      let targetPlan: 'BASICO' | 'PRO' | null = null

      // Determine which plan to offer based on current plan
      if (store.subscriptionPlan === 'FREE') {
        // FREE users can upgrade to BASICO
        targetPlan = 'BASICO'
      } else if (store.subscriptionPlan === 'BASICO') {
        // BASICO users can upgrade to PRO
        targetPlan = 'PRO'
      } else if (store.subscriptionPlan === 'PRO' && (store.subscriptionStatus === 'EXPIRED' || store.subscriptionStatus === 'EXPIRING_SOON')) {
        // Expired PRO users can renew PRO
        targetPlan = 'PRO'
      }
      // If plan is PRO and active, no checkout URL (already at max)

      if (targetPlan) {
        checkoutUrl = buildCheckoutUrl(
          targetPlan,
          storeId,
          store.slug,
          user?.email ?? '',
          user?.name ?? '',
        )
      }
    } catch {
      // LS env vars not configured — fail silently
    }
  }

  return NextResponse.json({
    plan: store.subscriptionPlan ?? 'FREE',
    status: store.subscriptionStatus,
    endDate: store.subscriptionEndDate ?? null,
    daysRemaining,
    checkoutUrl,
  })
}
