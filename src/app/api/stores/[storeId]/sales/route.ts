import { NextResponse } from 'next/server'
import {
  requireStoreAccess,
  requireRole,
  getStoreIdFromHeaders,
  getUserIdFromHeaders,
} from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Sale, SaleStatus } from '@/lib/db/entities/sale.entity'
import { SaleItem } from '@/lib/db/entities/sale-item.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { StockMovement, MovementType } from '@/lib/db/entities/stock-movement.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { createSaleSchema } from '@/lib/validations/sale.schema'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId: paramStoreId } = await params
    const headerStoreId = getStoreIdFromHeaders(request)
    const storeId = headerStoreId || paramStoreId

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    await requireStoreAccess(storeId)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const dataSource = await getDataSource()
    const saleRepo = dataSource.getRepository(Sale)

    let query = saleRepo
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.items', 'items')
      .leftJoinAndSelect('sale.cashier', 'cashier')
      .where('sale.storeId = :storeId', { storeId })

    if (status) {
      query = query.andWhere('sale.status = :status', { status })
    }

    if (startDate) {
      query = query.andWhere('sale.createdAt >= :startDate', { startDate })
    }

    if (endDate) {
      query = query.andWhere('sale.createdAt <= :endDate', { endDate })
    }

    const sales = await query
      .orderBy('sale.createdAt', 'DESC')
      .getMany()

    return NextResponse.json(sales)
  } catch (error) {
    console.error('Get sales error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId: paramStoreId } = await params
    const headerStoreId = getStoreIdFromHeaders(request)
    const storeId = headerStoreId || paramStoreId

    let userId = getUserIdFromHeaders(request)

    // Fallback: if userId is missing from headers, try to get it from session
    if (!userId) {
      const { auth } = await import('@/lib/auth/auth')
      const session = await auth()
      userId = session?.user?.id || null
    }

    if (!storeId || !userId) {
      return NextResponse.json(
        { error: !storeId ? 'Store ID required' : 'User ID required' },
        { status: 400 }
      )
    }

    await requireRole(storeId, [
      EmploymentRole.ADMIN,
      EmploymentRole.MANAGER,
      EmploymentRole.CASHIER,
    ])

    const body = await request.json()
    const validated = createSaleSchema.parse(body)

    const dataSource = await getDataSource()

    // CRITICAL: Atomic transaction - all operations succeed or all fail
    const sale = await dataSource.transaction(async (manager) => {
      // Step 1: Validate stock for ALL items first
      for (const item of validated.items) {
        const product = await manager.findOne(Product, {
          where: { id: item.productId, storeId },
        })

        if (!product) {
          throw new Error(`Product ${item.productId} not found`)
        }

        if (!product.isActive) {
          throw new Error(`Product ${product.name} is inactive`)
        }

        if (product.trackStock && product.currentStock < item.quantity) {
          throw new Error(
            `Insufficient stock for ${product.name}. Available: ${product.currentStock}, Requested: ${item.quantity}`
          )
        }
      }

      // Step 2: Calculate totals
      let subtotal = 0
      for (const item of validated.items) {
        const itemSubtotal = item.quantity * item.unitPrice
        const itemDiscount = item.discount || 0
        subtotal += itemSubtotal - itemDiscount
      }

      const total = subtotal + validated.tax - validated.discount

      // Step 3: Create sale record
      const sale = manager.create(Sale, {
        storeId,
        cashierId: userId,
        paymentMethod: validated.paymentMethod,
        status: SaleStatus.PENDING,
        subtotal,
        tax: validated.tax,
        discount: validated.discount,
        total,
        amountPaid: validated.amountPaid,
        change: validated.amountPaid ? validated.amountPaid - total : undefined,
        notes: validated.notes,
        customerName: validated.customerName,
        customerEmail: validated.customerEmail,
        customerPhone: validated.customerPhone,
      })

      await manager.save(sale)

      // Step 4: Create sale items
      for (const item of validated.items) {
        const product = await manager.findOne(Product, {
          where: { id: item.productId },
        })

        if (!product) continue // Already validated above

        const itemSubtotal = item.quantity * item.unitPrice
        const itemDiscount = item.discount || 0
        const itemTaxRate = item.taxRate || 0
        const itemTaxAmount = item.taxAmount || 0
        const itemTotal = itemSubtotal - itemDiscount + itemTaxAmount

        const saleItem = manager.create(SaleItem, {
          saleId: sale.id,
          productId: item.productId,
          productName: product.name,
          productSku: product.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: itemDiscount,
          subtotal: itemSubtotal,
          total: itemTotal,
          taxRate: itemTaxRate,
          taxAmount: itemTaxAmount,
        })

        await manager.save(saleItem)
      }

      // Step 5: Create stock movements and update product stock
      for (const item of validated.items) {
        const product = await manager.findOne(Product, {
          where: { id: item.productId },
        })

        if (!product || !product.trackStock) continue

        // Create stock movement record
        const movement = manager.create(StockMovement, {
          productId: item.productId,
          type: MovementType.SALE,
          quantity: -item.quantity, // Negative for sale
          unitPrice: item.unitPrice,
          userId,
          saleId: sale.id,
          reference: `Sale #${sale.id.substring(0, 8)}`,
        })

        await manager.save(movement)

        // Decrement product stock
        await manager.decrement(
          Product,
          { id: item.productId },
          'currentStock',
          item.quantity
        )
      }

      // Step 6: Mark sale as completed
      sale.status = SaleStatus.COMPLETED
      sale.completedAt = new Date()
      await manager.save(sale)

      return sale
    })

    // Fetch complete sale with relations
    const completeSale = await dataSource.getRepository(Sale).findOne({
      where: { id: sale.id },
      relations: ['items', 'cashier'],
    })

    return NextResponse.json(completeSale, { status: 201 })
  } catch (error) {
    console.error('Create sale error:', error)

    if (error instanceof Error) {
      if (error.message.includes('Insufficient stock')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Invalid input data', details: error },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create sale' },
      { status: 500 }
    )
  }
}
