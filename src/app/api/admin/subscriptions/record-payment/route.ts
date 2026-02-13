import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/permissions'
import { SubscriptionService } from '@/lib/services/subscription.service'
import { recordPaymentSchema } from '@/lib/validations/subscription.schema'

export async function POST(request: Request) {
  try {
    const session = await requireSuperAdmin()

    const body = await request.json()
    const validated = recordPaymentSchema.parse(body)

    // Get current user ID
    const userId = session.user.id

    // Record the payment
    const payment = await SubscriptionService.recordPayment(validated, userId)

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        storeId: payment.storeId,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        referenceNumber: payment.referenceNumber,
        paymentDate: payment.paymentDate,
        durationMonths: payment.durationMonths,
        periodStartDate: payment.periodStartDate,
        periodEndDate: payment.periodEndDate,
      },
    }, { status: 201 })
  } catch (error: any) {
    console.error('Record payment error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to record payment' },
      { status: 500 }
    )
  }
}
