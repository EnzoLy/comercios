import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/permissions'
import { getRepository } from '@/lib/db'
import { Store } from '@/lib/db/entities/store.entity'

const VALID_PLANS = ['FREE', 'BASICO', 'PRO'] as const
type Plan = (typeof VALID_PLANS)[number]

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    await requireSuperAdmin()

    const { storeId } = await params
    const body = await request.json()
    const plan: Plan = body.plan

    if (!VALID_PLANS.includes(plan)) {
      return NextResponse.json(
        { error: `Plan inválido. Debe ser uno de: ${VALID_PLANS.join(', ')}` },
        { status: 400 }
      )
    }

    const storeRepo = await getRepository(Store)
    const store = await storeRepo.findOne({ where: { id: storeId } })

    if (!store) {
      return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
    }

    store.subscriptionPlan = plan

    // When setting FREE: make permanent so access is never blocked by expiry
    if (plan === 'FREE') {
      store.isPermanent = true
      store.subscriptionStatus = 'PERMANENT'
      store.subscriptionEndDate = undefined
    }

    await storeRepo.save(store)

    return NextResponse.json({
      success: true,
      subscriptionPlan: store.subscriptionPlan,
      subscriptionStatus: store.subscriptionStatus,
      isPermanent: store.isPermanent,
    })
  } catch (error: any) {
    console.error('Set plan error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al actualizar el plan' },
      { status: 500 }
    )
  }
}
