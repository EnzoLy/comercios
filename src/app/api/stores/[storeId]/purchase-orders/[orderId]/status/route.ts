import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { PurchaseOrder, PurchaseOrderStatus } from '@/lib/db/entities/purchase-order.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { updateStatusSchema } from '@/lib/validations/purchase-order.schema'

// Valid status transitions
const VALID_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  [PurchaseOrderStatus.DRAFT]: [
    PurchaseOrderStatus.SENT,
    PurchaseOrderStatus.CANCELLED
  ],
  [PurchaseOrderStatus.SENT]: [
    PurchaseOrderStatus.CONFIRMED,
    PurchaseOrderStatus.CANCELLED
  ],
  [PurchaseOrderStatus.CONFIRMED]: [
    PurchaseOrderStatus.PARTIALLY_RECEIVED,
    PurchaseOrderStatus.RECEIVED,
    PurchaseOrderStatus.CANCELLED
  ],
  [PurchaseOrderStatus.PARTIALLY_RECEIVED]: [
    PurchaseOrderStatus.RECEIVED,
    PurchaseOrderStatus.CANCELLED
  ],
  [PurchaseOrderStatus.RECEIVED]: [],
  [PurchaseOrderStatus.CANCELLED]: []
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string; orderId: string }> }
) {
  try {
    const { storeId, orderId } = await params

    if (!storeId || !orderId) {
      return NextResponse.json(
        { error: 'Store ID and Order ID required' },
        { status: 400 }
      )
    }

    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const body = await request.json()
    const validated = updateStatusSchema.parse(body)

    const dataSource = await getDataSource()
    const purchaseOrderRepo = dataSource.getRepository(PurchaseOrder)

    const purchaseOrder = await purchaseOrderRepo.findOne({
      where: { id: orderId, storeId },
    })

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    // Validate status transition
    const allowedStatuses = VALID_TRANSITIONS[purchaseOrder.status]
    if (!allowedStatuses.includes(validated.status)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from ${purchaseOrder.status} to ${validated.status}. Allowed: ${allowedStatuses.join(', ')}`
        },
        { status: 400 }
      )
    }

    // Update status
    purchaseOrder.status = validated.status

    // Set actualDeliveryDate if moving to RECEIVED
    if (validated.status === PurchaseOrderStatus.RECEIVED && !purchaseOrder.actualDeliveryDate) {
      purchaseOrder.actualDeliveryDate = new Date()
    }

    // Update notes if provided
    if (validated.notes !== undefined) {
      purchaseOrder.notes = validated.notes
    }

    await purchaseOrderRepo.save(purchaseOrder)

    // Fetch updated purchase order with relations
    const updatedPO = await purchaseOrderRepo.findOne({
      where: { id: orderId },
      relations: ['supplier', 'items', 'items.product'],
    })

    return NextResponse.json(updatedPO)
  } catch (error: any) {
    console.error('Update purchase order status error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update purchase order status' },
      { status: 500 }
    )
  }
}
