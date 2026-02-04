import { NextResponse } from 'next/server'
import { requireRole, getUserIdFromHeaders } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { PurchaseOrder, PurchaseOrderStatus } from '@/lib/db/entities/purchase-order.entity'
import { PurchaseOrderItem } from '@/lib/db/entities/purchase-order-item.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { StockMovement, MovementType } from '@/lib/db/entities/stock-movement.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { receiveItemsSchema } from '@/lib/validations/purchase-order.schema'

export async function POST(
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

    let userId = getUserIdFromHeaders(request)

    // Fallback: if userId is missing from headers, try to get it from session
    if (!userId) {
      const { auth } = await import('@/lib/auth/auth')
      const session = await auth()
      userId = session?.user?.id || null
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validated = receiveItemsSchema.parse(body)

    const dataSource = await getDataSource()

    // CRITICAL: Atomic transaction - all operations succeed or all fail
    const result = await dataSource.transaction(async (manager) => {
      // Step 1: Get purchase order with items
      const purchaseOrder = await manager.findOne(PurchaseOrder, {
        where: { id: orderId, storeId },
        relations: ['items', 'items.product'],
      })

      if (!purchaseOrder) {
        throw new Error('Purchase order not found')
      }

      // Don't allow receiving if already fully received or cancelled
      if (purchaseOrder.status === PurchaseOrderStatus.RECEIVED) {
        throw new Error('Purchase order is already fully received')
      }

      if (purchaseOrder.status === PurchaseOrderStatus.CANCELLED) {
        throw new Error('Cannot receive items from a cancelled purchase order')
      }

      // Step 2: Validate and process each item
      const itemUpdates: Array<{
        item: PurchaseOrderItem
        quantityToReceive: number
      }> = []

      for (const receiveItem of validated.items) {
        const poItem = purchaseOrder.items?.find(i => i.id === receiveItem.itemId)

        if (!poItem) {
          throw new Error(`Purchase order item ${receiveItem.itemId} not found`)
        }

        // Validate quantity
        const remainingQuantity = poItem.quantityOrdered - poItem.quantityReceived
        if (receiveItem.quantityReceived > remainingQuantity) {
          throw new Error(
            `Cannot receive ${receiveItem.quantityReceived} units of item ${poItem.id}. ` +
            `Only ${remainingQuantity} units remaining (ordered: ${poItem.quantityOrdered}, ` +
            `already received: ${poItem.quantityReceived})`
          )
        }

        // Skip if quantity is 0
        if (receiveItem.quantityReceived === 0) {
          continue
        }

        itemUpdates.push({
          item: poItem,
          quantityToReceive: receiveItem.quantityReceived
        })
      }

      if (itemUpdates.length === 0) {
        throw new Error('No items to receive')
      }

      // Step 3: Update items, create stock movements, and update product stock
      for (const { item, quantityToReceive } of itemUpdates) {
        // Update quantityReceived
        item.quantityReceived += quantityToReceive
        await manager.save(item)

        // Verify product exists and belongs to store
        const product = await manager.findOne(Product, {
          where: { id: item.productId, storeId },
        })

        if (!product) {
          throw new Error(`Product ${item.productId} not found`)
        }

        // Create stock movement record
        const movement = manager.create(StockMovement, {
          productId: item.productId,
          type: MovementType.PURCHASE,
          quantity: quantityToReceive, // Positive for purchase
          unitPrice: item.unitPrice,
          userId,
          reference: `PO: ${purchaseOrder.orderNumber}`,
          notes: `Received ${quantityToReceive} units from purchase order ${purchaseOrder.orderNumber}`,
        })

        await manager.save(movement)

        // Update product stock (only if product tracks stock)
        if (product.trackStock) {
          await manager.increment(
            Product,
            { id: item.productId },
            'currentStock',
            quantityToReceive
          )
        }
      }

      // Step 4: Update purchase order status
      // Check if all items are fully received
      const updatedItems = await manager.find(PurchaseOrderItem, {
        where: { purchaseOrderId: orderId },
      })

      const allFullyReceived = updatedItems.every(
        item => item.quantityReceived >= item.quantityOrdered
      )

      const anyReceived = updatedItems.some(
        item => item.quantityReceived > 0
      )

      if (allFullyReceived) {
        purchaseOrder.status = PurchaseOrderStatus.RECEIVED
      } else if (anyReceived) {
        purchaseOrder.status = PurchaseOrderStatus.PARTIALLY_RECEIVED
      }

      // Set actualDeliveryDate if not already set
      if (!purchaseOrder.actualDeliveryDate) {
        purchaseOrder.actualDeliveryDate = new Date()
      }

      await manager.save(purchaseOrder)

      return purchaseOrder
    })

    // Fetch complete purchase order with relations
    const completePO = await dataSource.getRepository(PurchaseOrder).findOne({
      where: { id: orderId },
      relations: ['supplier', 'items', 'items.product'],
    })

    return NextResponse.json(completePO, { status: 200 })
  } catch (error: any) {
    console.error('Receive items error:', error)

    if (error instanceof Error) {
      if (
        error.message.includes('not found') ||
        error.message.includes('Cannot receive') ||
        error.message.includes('already fully received') ||
        error.message.includes('cancelled') ||
        error.message.includes('No items')
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to receive items' },
      { status: 500 }
    )
  }
}
