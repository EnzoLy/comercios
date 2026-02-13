import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/permissions'
import { SubscriptionService } from '@/lib/services/subscription.service'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    await requireSuperAdmin()

    const { storeId } = await params

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 })
    }

    const payments = await SubscriptionService.getPaymentHistory(storeId)

    const formatted = payments.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      referenceNumber: payment.referenceNumber,
      paymentDate: payment.paymentDate,
      durationMonths: payment.durationMonths,
      periodStartDate: payment.periodStartDate,
      periodEndDate: payment.periodEndDate,
      notes: payment.notes,
      recordedBy: {
        id: payment.recordedBy.id,
        name: payment.recordedBy.name,
        email: payment.recordedBy.email,
      },
      createdAt: payment.createdAt,
    }))

    return NextResponse.json(formatted)
  } catch (error: any) {
    console.error('Get payment history error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payment history' },
      { status: 500 }
    )
  }
}
