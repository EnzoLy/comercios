import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/permissions'
import { SubscriptionService } from '@/lib/services/subscription.service'
import { togglePermanentSchema } from '@/lib/validations/subscription.schema'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    await requireSuperAdmin()

    const { storeId } = await params
    const body = await request.json()

    const validated = togglePermanentSchema.parse({
      storeId,
      ...body,
    })

    const updatedStore = await SubscriptionService.togglePermanent(
      validated.storeId,
      validated.isPermanent
    )

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
    console.error('Toggle permanent subscription error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to toggle permanent subscription' },
      { status: 500 }
    )
  }
}
