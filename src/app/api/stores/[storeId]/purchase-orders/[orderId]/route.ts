import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { PurchaseOrder, PurchaseOrderStatus } from '@/lib/db/entities/purchase-order.entity'
import { PurchaseOrderItem } from '@/lib/db/entities/purchase-order-item.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { updatePurchaseOrderSchema } from '@/lib/validations/purchase-order.schema'

export async function GET(
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

    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const purchaseOrderRepo = dataSource.getRepository(PurchaseOrder)

    const purchaseOrder = await purchaseOrderRepo.findOne({
      where: { id: orderId, storeId },
      relations: ['supplier', 'items', 'items.product'],
    })

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(purchaseOrder)
  } catch (error) {
    console.error('Get purchase order error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchase order' },
      { status: 500 }
    )
  }
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
    const validated = updatePurchaseOrderSchema.parse(body)

    const dataSource = await getDataSource()
    const purchaseOrderRepo = dataSource.getRepository(PurchaseOrder)

    const purchaseOrder = await purchaseOrderRepo.findOne({
      where: { id: orderId, storeId },
      relations: ['items'],
    })

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    // Don't allow editing if status is RECEIVED or CANCELLED
    if (
      purchaseOrder.status === PurchaseOrderStatus.RECEIVED ||
      purchaseOrder.status === PurchaseOrderStatus.CANCELLED
    ) {
      return NextResponse.json(
        {
          error: `Cannot edit purchase order with status ${purchaseOrder.status}`
        },
        { status: 400 }
      )
    }

    // Use transaction if items are being updated
    if (validated.items) {
      await dataSource.transaction(async (manager) => {
        // Step 1: Validate all products exist
        for (const item of validated.items!) {
          const product = await manager.findOne(Product, {
            where: { id: item.productId, storeId },
          })

          if (!product) {
            throw new Error(`Product ${item.productId} not found`)
          }
        }

        // Step 2: Delete existing items
        await manager.delete(PurchaseOrderItem, {
          purchaseOrderId: orderId,
        })

        // Step 3: Calculate totals
        let subtotal = 0
        const itemsWithTotal = validated.items!.map(item => {
          const itemSubtotal = item.quantityOrdered * item.unitPrice
          const discountAmount = itemSubtotal * (item.discountPercentage / 100)
          const totalPrice = itemSubtotal - discountAmount
          subtotal += totalPrice

          return {
            ...item,
            totalPrice
          }
        })

        const taxAmount = validated.taxAmount ?? purchaseOrder.taxAmount
        const shippingCost = validated.shippingCost ?? purchaseOrder.shippingCost
        const totalAmount = subtotal + (taxAmount || 0) + (shippingCost || 0)

        // Step 4: Create new items
        for (const item of itemsWithTotal) {
          const poItem = manager.create(PurchaseOrderItem, {
            purchaseOrderId: orderId,
            productId: item.productId,
            quantityOrdered: item.quantityOrdered,
            quantityReceived: 0,
            unitPrice: item.unitPrice,
            discountPercentage: item.discountPercentage,
            taxRate: item.taxRate,
            totalPrice: item.totalPrice,
            notes: item.notes,
          })

          await manager.save(poItem)
        }

        // Step 5: Update purchase order
        purchaseOrder.subtotal = subtotal
        purchaseOrder.totalAmount = totalAmount

        if (validated.supplierId !== undefined)
          purchaseOrder.supplierId = validated.supplierId
        if (validated.orderDate !== undefined)
          purchaseOrder.orderDate = new Date(validated.orderDate)
        if (validated.expectedDeliveryDate !== undefined)
          purchaseOrder.expectedDeliveryDate = new Date(validated.expectedDeliveryDate)
        if (validated.actualDeliveryDate !== undefined)
          purchaseOrder.actualDeliveryDate = new Date(validated.actualDeliveryDate)
        if (validated.taxAmount !== undefined)
          purchaseOrder.taxAmount = validated.taxAmount
        if (validated.shippingCost !== undefined)
          purchaseOrder.shippingCost = validated.shippingCost
        if (validated.notes !== undefined) purchaseOrder.notes = validated.notes
        if (validated.status !== undefined) purchaseOrder.status = validated.status

        await manager.save(purchaseOrder)
      })
    } else {
      // Simple update without items
      if (validated.supplierId !== undefined)
        purchaseOrder.supplierId = validated.supplierId
      if (validated.orderDate !== undefined)
        purchaseOrder.orderDate = new Date(validated.orderDate)
      if (validated.expectedDeliveryDate !== undefined)
        purchaseOrder.expectedDeliveryDate = new Date(validated.expectedDeliveryDate)
      if (validated.actualDeliveryDate !== undefined)
        purchaseOrder.actualDeliveryDate = new Date(validated.actualDeliveryDate)
      if (validated.taxAmount !== undefined)
        purchaseOrder.taxAmount = validated.taxAmount
      if (validated.shippingCost !== undefined)
        purchaseOrder.shippingCost = validated.shippingCost
      if (validated.notes !== undefined) purchaseOrder.notes = validated.notes
      if (validated.status !== undefined) purchaseOrder.status = validated.status

      await purchaseOrderRepo.save(purchaseOrder)
    }

    // Fetch updated purchase order with relations
    const updatedPO = await purchaseOrderRepo.findOne({
      where: { id: orderId },
      relations: ['supplier', 'items', 'items.product'],
    })

    return NextResponse.json(updatedPO)
  } catch (error: any) {
    console.error('Update purchase order error:', error)

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
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
      { error: 'Failed to update purchase order' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Only allow deletion if DRAFT or CANCELLED
    if (
      purchaseOrder.status !== PurchaseOrderStatus.DRAFT &&
      purchaseOrder.status !== PurchaseOrderStatus.CANCELLED
    ) {
      return NextResponse.json(
        {
          error: `Cannot delete purchase order with status ${purchaseOrder.status}. Only DRAFT or CANCELLED orders can be deleted.`
        },
        { status: 400 }
      )
    }

    await purchaseOrderRepo.remove(purchaseOrder)

    return NextResponse.json({
      success: true,
      message: 'Purchase order deleted successfully'
    })
  } catch (error) {
    console.error('Delete purchase order error:', error)
    return NextResponse.json(
      { error: 'Failed to delete purchase order' },
      { status: 500 }
    )
  }
}
