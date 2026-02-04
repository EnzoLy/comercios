import { NextResponse } from 'next/server'
import { requireStoreAccess } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { PurchaseOrder } from '@/lib/db/entities/purchase-order.entity'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const purchaseOrderRepo = dataSource.getRepository(PurchaseOrder)

    // Get current year for order number
    const currentYear = new Date().getFullYear()
    const prefix = `PO-${currentYear}-`

    // Find the latest order number for this year
    const lastOrder = await purchaseOrderRepo
      .createQueryBuilder('po')
      .where('po.storeId = :storeId', { storeId })
      .andWhere('po.orderNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('po.orderNumber', 'DESC')
      .getOne()

    let nextOrderNumber: string
    if (lastOrder && lastOrder.orderNumber) {
      const lastNumber = parseInt(lastOrder.orderNumber.split('-')[2])
      const nextNumber = (lastNumber + 1).toString().padStart(4, '0')
      nextOrderNumber = `${prefix}${nextNumber}`
    } else {
      nextOrderNumber = `${prefix}0001`
    }

    return NextResponse.json({ orderNumber: nextOrderNumber })
  } catch (error) {
    console.error('Generate order number error:', error)
    return NextResponse.json(
      { error: 'Failed to generate order number' },
      { status: 500 }
    )
  }
}
