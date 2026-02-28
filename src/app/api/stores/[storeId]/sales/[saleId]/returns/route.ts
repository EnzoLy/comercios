import { NextResponse } from 'next/server'
import { requireRole, getUserIdFromHeaders } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Sale, SaleStatus } from '@/lib/db/entities/sale.entity'
import { SaleItem } from '@/lib/db/entities/sale-item.entity'
import { SaleReturn } from '@/lib/db/entities/sale-return.entity'
import { SaleReturnItem } from '@/lib/db/entities/sale-return-item.entity'
import { StockMovement, MovementType } from '@/lib/db/entities/stock-movement.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { createSaleReturnSchema } from '@/lib/validations/sale-return.schema'
import { RefundMethod } from '@/lib/db/entities/sale-return.entity'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string; saleId: string }> }
) {
  try {
    const { storeId, saleId } = await params

    await requireRole(storeId, [
      EmploymentRole.ADMIN,
      EmploymentRole.MANAGER,
      EmploymentRole.STOCK_KEEPER,
      EmploymentRole.CASHIER,
    ])

    let userId = getUserIdFromHeaders(request)
    if (!userId) {
      const { auth } = await import('@/lib/auth/auth')
      const session = await auth()
      userId = session?.user?.id || null
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    const body = await request.json()
    const validated = createSaleReturnSchema.parse(body)

    const dataSource = await getDataSource()

    const saleReturn = await dataSource.transaction(async (manager) => {
      // Step 1: Load sale and verify it belongs to store and is returnable
      const sale = await manager.findOne(Sale, {
        where: { id: saleId, storeId },
        relations: ['items'],
      })

      if (!sale) {
        throw Object.assign(new Error('Sale not found'), { statusCode: 404 })
      }

      if (
        sale.status !== SaleStatus.COMPLETED &&
        sale.status !== SaleStatus.PARTIALLY_REFUNDED
      ) {
        throw Object.assign(
          new Error('Only COMPLETED or PARTIALLY_REFUNDED sales can be returned'),
          { statusCode: 400 }
        )
      }

      // Step 2: Load already-returned quantities for each sale item in this sale
      const existingReturns = await manager
        .createQueryBuilder(SaleReturnItem, 'sri')
        .innerJoin('sri.saleReturn', 'sr')
        .where('sr.saleId = :saleId', { saleId })
        .getMany()

      const returnedQtyBySaleItemId = new Map<string, number>()
      for (const ri of existingReturns) {
        const prev = returnedQtyBySaleItemId.get(ri.saleItemId) || 0
        returnedQtyBySaleItemId.set(ri.saleItemId, prev + ri.quantity)
      }

      // Step 3: Validate requested items against original sale items
      const saleItemsById = new Map<string, SaleItem>(
        (sale.items as SaleItem[]).map((i) => [i.id, i])
      )

      for (const reqItem of validated.items) {
        const originalItem = saleItemsById.get(reqItem.saleItemId)
        if (!originalItem) {
          throw Object.assign(
            new Error(`Sale item ${reqItem.saleItemId} not found in this sale`),
            { statusCode: 400 }
          )
        }

        const alreadyReturned = returnedQtyBySaleItemId.get(reqItem.saleItemId) || 0
        const available = originalItem.quantity - alreadyReturned

        if (reqItem.quantity > available) {
          throw Object.assign(
            new Error(
              `Cannot return ${reqItem.quantity} of "${originalItem.productName}". ` +
                `Available to return: ${available}`
            ),
            { statusCode: 400 }
          )
        }
      }

      // Step 4: Create SaleReturn header
      const returnInsert = await manager.insert(SaleReturn, {
        saleId,
        storeId,
        processedById: userId!,
        refundMethod: validated.refundMethod as RefundMethod,
        refundAmount: validated.refundAmount,
        notes: validated.notes ?? null,
      })
      const saleReturnId = returnInsert.identifiers[0].id as string

      // Step 5: Create return items, restock inventory if requested
      for (const reqItem of validated.items) {
        const originalItem = saleItemsById.get(reqItem.saleItemId)!

        await manager.insert(SaleReturnItem, {
          saleReturnId,
          saleItemId: reqItem.saleItemId,
          quantity: reqItem.quantity,
          unitPrice: Number(originalItem.unitPrice),
          total: Number(originalItem.unitPrice) * reqItem.quantity,
          restockItem: reqItem.restockItem,
        })

        // Restock product if requested and item is a product (not a service)
        if (reqItem.restockItem && originalItem.productId) {
          const product = await manager.findOne(Product, {
            where: { id: originalItem.productId },
          })

          if (product && product.trackStock) {
            // Create stock movement
            await manager.insert(StockMovement, {
              productId: originalItem.productId,
              type: MovementType.RETURN,
              quantity: reqItem.quantity, // Positive: stock coming back
              unitPrice: Number(originalItem.unitPrice),
              userId,
              saleId,
              reference: `Return #${saleReturnId.substring(0, 8).toUpperCase()}`,
            })

            // Increment product stock
            await manager.increment(
              Product,
              { id: originalItem.productId },
              'currentStock',
              reqItem.quantity
            )
          }
        }
      }

      // Step 6: Determine new sale status
      // Recalculate total returned quantities after this return
      const allReturnedQty = new Map<string, number>(returnedQtyBySaleItemId)
      for (const reqItem of validated.items) {
        const prev = allReturnedQty.get(reqItem.saleItemId) || 0
        allReturnedQty.set(reqItem.saleItemId, prev + reqItem.quantity)
      }

      // Only product items count toward full-return status
      const productItems = (sale.items as SaleItem[]).filter((i) => i.productId !== null)
      const allFullyReturned =
        productItems.length > 0 &&
        productItems.every((i) => (allReturnedQty.get(i.id) || 0) >= i.quantity)

      const newStatus = allFullyReturned
        ? SaleStatus.REFUNDED
        : SaleStatus.PARTIALLY_REFUNDED

      await manager.update(Sale, { id: saleId }, { status: newStatus })

      return saleReturnId
    })

    // Fetch created return with items
    const createdReturn = await dataSource.getRepository(SaleReturn).findOne({
      where: { id: saleReturn },
      relations: ['items'],
    })

    return NextResponse.json(createdReturn, { status: 201 })
  } catch (error: any) {
    console.error('Create sale return error:', error)

    if (error?.statusCode === 404) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    if (error?.statusCode === 400) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input data', details: error }, { status: 400 })
    }

    if (error?.name === 'ForbiddenError') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    if (error?.name === 'UnauthorizedError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    return NextResponse.json({ error: 'Failed to process return' }, { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string; saleId: string }> }
) {
  try {
    const { storeId, saleId } = await params

    await requireRole(storeId, [
      EmploymentRole.ADMIN,
      EmploymentRole.MANAGER,
      EmploymentRole.STOCK_KEEPER,
      EmploymentRole.CASHIER,
    ])

    const dataSource = await getDataSource()
    const returnRepo = dataSource.getRepository(SaleReturn)

    // Verify sale belongs to store
    const saleRepo = dataSource.getRepository(Sale)
    const sale = await saleRepo.findOne({ where: { id: saleId, storeId } })
    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
    }

    const returns = await returnRepo.find({
      where: { saleId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    })

    return NextResponse.json(returns)
  } catch (error: any) {
    console.error('Get sale returns error:', error)
    return NextResponse.json({ error: 'Failed to fetch returns' }, { status: 500 })
  }
}
