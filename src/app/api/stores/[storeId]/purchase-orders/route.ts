import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { PurchaseOrder } from '@/lib/db/entities/purchase-order.entity'
import { PurchaseOrderItem } from '@/lib/db/entities/purchase-order-item.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import {
  createPurchaseOrderSchema,
  purchaseOrderQuerySchema
} from '@/lib/validations/purchase-order.schema'

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

    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const validated = purchaseOrderQuerySchema.parse(queryParams)

    const dataSource = await getDataSource()
    const purchaseOrderRepo = dataSource.getRepository(PurchaseOrder)

    let query = purchaseOrderRepo
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .where('po.storeId = :storeId', { storeId })

    // Apply filters
    if (validated.supplierId) {
      query = query.andWhere('po.supplierId = :supplierId', {
        supplierId: validated.supplierId
      })
    }

    if (validated.status) {
      query = query.andWhere('po.status = :status', { status: validated.status })
    }

    if (validated.startDate) {
      query = query.andWhere('po.orderDate >= :startDate', {
        startDate: validated.startDate
      })
    }

    if (validated.endDate) {
      query = query.andWhere('po.orderDate <= :endDate', {
        endDate: validated.endDate
      })
    }

    // Apply sorting
    const sortField = `po.${validated.sortBy}`
    query = query.orderBy(sortField, validated.sortOrder.toUpperCase() as 'ASC' | 'DESC')

    // Apply pagination
    const skip = (validated.page - 1) * validated.limit
    query = query.skip(skip).take(validated.limit)

    // Include items count
    query = query.loadRelationCountAndMap('po.itemsCount', 'po.items')

    const [orders, total] = await query.getManyAndCount()

    return NextResponse.json({
      data: orders,
      pagination: {
        page: validated.page,
        limit: validated.limit,
        total,
        totalPages: Math.ceil(total / validated.limit),
      }
    })
  } catch (error) {
    console.error('Get purchase orders error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    const session = await requireRole(storeId, [
      EmploymentRole.ADMIN,
      EmploymentRole.MANAGER
    ])

    const body = await request.json()
    const validated = createPurchaseOrderSchema.parse(body)

    const dataSource = await getDataSource()

    // Use transaction to create purchase order atomically
    const purchaseOrder = await dataSource.transaction(async (manager) => {
      // Step 1: Generate order number
      const currentYear = new Date().getFullYear()
      const prefix = `PO-${currentYear}-`

      const lastOrder = await manager
        .getRepository(PurchaseOrder)
        .createQueryBuilder('po')
        .where('po.storeId = :storeId', { storeId })
        .andWhere('po.orderNumber LIKE :prefix', { prefix: `${prefix}%` })
        .orderBy('po.orderNumber', 'DESC')
        .getOne()

      let orderNumber: string
      if (lastOrder && lastOrder.orderNumber) {
        const lastNumber = parseInt(lastOrder.orderNumber.split('-')[2])
        const nextNumber = (lastNumber + 1).toString().padStart(4, '0')
        orderNumber = `${prefix}${nextNumber}`
      } else {
        orderNumber = `${prefix}0001`
      }

      // Step 2: Validate all products exist
      for (const item of validated.items) {
        const product = await manager.findOne(Product, {
          where: { id: item.productId, storeId },
        })

        if (!product) {
          throw new Error(`Product ${item.productId} not found`)
        }
      }

      // Step 3: Calculate totals
      let subtotal = 0
      const itemsWithTotal = validated.items.map(item => {
        const itemSubtotal = item.quantityOrdered * item.unitPrice
        const discountAmount = itemSubtotal * (item.discountPercentage / 100)
        const totalPrice = itemSubtotal - discountAmount
        subtotal += totalPrice

        return {
          ...item,
          totalPrice
        }
      })

      const taxAmount = validated.taxAmount || 0
      const shippingCost = validated.shippingCost || 0
      const totalAmount = subtotal + taxAmount + shippingCost

      // Step 4: Create purchase order
      const orderDate = validated.orderDate ? new Date(validated.orderDate) : new Date()
      const purchaseOrder = manager.create(PurchaseOrder, {
        storeId,
        supplierId: validated.supplierId,
        orderNumber,
        orderDate,
        expectedDeliveryDate: validated.expectedDeliveryDate
          ? new Date(validated.expectedDeliveryDate)
          : undefined,
        status: validated.status,
        subtotal,
        taxAmount,
        shippingCost,
        totalAmount,
        notes: validated.notes,
        createdBy: session.user.id,
      })

      await manager.save(purchaseOrder)

      // Step 5: Create purchase order items
      for (const item of itemsWithTotal) {
        const poItem = manager.create(PurchaseOrderItem, {
          purchaseOrderId: purchaseOrder.id,
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

      return purchaseOrder
    })

    // Fetch complete purchase order with relations
    const completePO = await dataSource.getRepository(PurchaseOrder).findOne({
      where: { id: purchaseOrder.id },
      relations: ['supplier', 'items', 'items.product'],
    })

    return NextResponse.json(completePO, { status: 201 })
  } catch (error: any) {
    console.error('Create purchase order error:', error)

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
      { error: 'Failed to create purchase order' },
      { status: 500 }
    )
  }
}
