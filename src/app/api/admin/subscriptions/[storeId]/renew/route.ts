import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/permissions'
import { SubscriptionService } from '@/lib/services/subscription.service'
import { renewSubscriptionSchema } from '@/lib/validations/subscription.schema'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    await requireSuperAdmin()

    const { storeId } = await params
    const body = await request.json()

    const validated = renewSubscriptionSchema.parse({
      storeId,
      ...body,
    })

    const updatedStore = await SubscriptionService.renewSubscription(validated)

    return NextResponse.json({
      success: true,
      store: {
        id: updatedStore.id,
        subscriptionStatus: updatedStore.subscriptionStatus,
        subscriptionEndDate: updatedStore.subscriptionEndDate,
        isPermanent: updatedStore.isPermanent,
      },
    })
  } catch (error: any) {
    console.error('Renew subscription error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to renew subscription' },
      { status: 500 }
    )
  }
}
