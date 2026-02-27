import { NextResponse } from 'next/server'
import {
  requireStoreAccess,
  requireRole,
  getStoreIdFromHeaders,
  getUserIdFromHeaders,
} from '@/lib/auth/permissions'
import { getDataSource, getRepository } from '@/lib/db'
import { Sale, SaleStatus } from '@/lib/db/entities/sale.entity'
import { SaleItem } from '@/lib/db/entities/sale-item.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { Service } from '@/lib/db/entities/service.entity'
import { ProductBatch } from '@/lib/db/entities/product-batch.entity'
import { StockMovement, MovementType } from '@/lib/db/entities/stock-movement.entity'
import { BatchStockMovement } from '@/lib/db/entities/batch-stock-movement.entity'
import { EmploymentRole, Employment } from '@/lib/db/entities/employment.entity'
import { DigitalInvoice } from '@/lib/db/entities/digital-invoice.entity'
import { createSaleSchema } from '@/lib/validations/sale.schema'
import { getBaseUrl } from '@/lib/utils/url'
import { FEFOService } from '@/lib/services/fefo.service'

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
      EmploymentRole.STOCK_KEEPER,
      EmploymentRole.CASHIER,
    ])

    const body = await request.json()
    const validated = createSaleSchema.parse(body)

    // NUEVO: Soportar activeUserId para multi-usuario en misma PC
    let cashierId = userId
    const { activeUserId } = body

    if (activeUserId && activeUserId !== userId) {
      // Validar que activeUserId tiene acceso al store
      const employmentRepo = await getRepository(Employment)
      const employment = await employmentRepo.findOne({
        where: { userId: activeUserId, storeId, isActive: true }
      })

      if (!employment) {
        return NextResponse.json(
          { error: 'Active user does not have access to this store' },
          { status: 403 }
        )
      }

      cashierId = activeUserId
    }

    const dataSource = await getDataSource()

    // CRITICAL: Atomic transaction - all operations succeed or all fail
    // Uses manager.insert() / manager.update() instead of manager.save() to avoid
    // TypeORM's topological sorter failing with "Cyclic dependency" on bidirectional relations.
    const sale = await dataSource.transaction(async (manager) => {
      // Step 1: Validate stock for ALL items first
      for (const item of validated.items) {
        // For product items, validate stock
        if (item.productId) {
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
        // For service items, validate service exists and is active
        else if (item.serviceId) {
          const service = await manager.findOne(Service, {
            where: { id: item.serviceId, storeId },
          })

          if (!service) {
            throw new Error(`Service ${item.serviceId} not found`)
          }

          if (!service.isActive) {
            throw new Error(`Service ${service.name} is inactive`)
          }
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

      // Step 3: Insert sale record
      const amountPaid = validated.amountPaid || total
      const saleInsertResult = await manager.insert(Sale, {
        storeId,
        cashierId,
        paymentMethod: validated.paymentMethod,
        status: SaleStatus.PENDING,
        subtotal,
        tax: validated.tax,
        discount: validated.discount,
        total,
        amountPaid,
        change: amountPaid - total,
        notes: validated.notes,
        customerName: validated.customerName,
        customerEmail: validated.customerEmail,
        customerPhone: validated.customerPhone,
      })
      const saleId = saleInsertResult.identifiers[0].id as string

      // Step 4: Insert sale items
      for (const item of validated.items) {
        const itemSubtotal = item.quantity * item.unitPrice
        const itemDiscount = item.discount || 0
        const itemTaxRate = item.taxRate || 0
        const itemTaxAmount = item.taxAmount || 0
        const itemTotal = itemSubtotal - itemDiscount + itemTaxAmount

        if (item.productId) {
          const product = await manager.findOne(Product, {
            where: { id: item.productId },
          })

          if (!product) continue // Already validated above

          await manager.insert(SaleItem, {
            saleId,
            productId: item.productId,
            serviceId: null,
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
        } else if (item.serviceId) {
          const service = await manager.findOne(Service, {
            where: { id: item.serviceId },
          })

          if (!service) continue // Already validated above

          await manager.insert(SaleItem, {
            saleId,
            productId: null,
            serviceId: item.serviceId,
            productName: service.name, // Use service name as productName for compatibility
            productSku: null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: itemDiscount,
            subtotal: itemSubtotal,
            total: itemTotal,
            taxRate: itemTaxRate,
            taxAmount: itemTaxAmount,
          })
        }
      }

      // Step 5: Insert stock movements and update product stock (only for products, not services)
      const fefoService = new FEFOService()

      for (const item of validated.items) {
        // Skip stock management for services
        if (item.serviceId) continue

        const product = await manager.findOne(Product, {
          where: { id: item.productId },
        })

        if (!product || !product.trackStock) continue

        // Insert stock movement record
        const movementInsertResult = await manager.insert(StockMovement, {
          productId: item.productId!,
          type: MovementType.SALE,
          quantity: -item.quantity, // Negative for sale
          unitPrice: item.unitPrice,
          userId,
          saleId,
          reference: `Sale #${saleId.substring(0, 8)}`,
        })
        const movementId = movementInsertResult.identifiers[0].id as string

        // If product tracks expiration dates, use FEFO to select batches
        if (product.trackExpirationDates) {
          try {
            // Try to get batches using FEFO (excluding expired by default)
            const batchAllocations = await fefoService.selectBatchesForQuantity(
              product.id,
              item.quantity,
              manager,
              false // Don't include expired batches initially
            )

            // Decrement from each selected batch
            for (const allocation of batchAllocations) {
              await manager.decrement(
                ProductBatch,
                { id: allocation.batchId },
                'currentQuantity',
                allocation.quantity
              )

              // Insert batch stock movement
              await manager.insert(BatchStockMovement, {
                batchId: allocation.batchId,
                productId: product.id,
                stockMovementId: movementId,
                type: MovementType.SALE,
                quantity: -allocation.quantity, // Negative for sale
                unitPrice: item.unitPrice,
                saleId,
                userId,
              })
            }
          } catch (fefoError: any) {
            // If FEFO fails due to insufficient valid stock but there are expired batches,
            // try again including expired batches
            if (fefoError.message.includes('Stock vigente insuficiente')) {
              // Re-throw with more context for UI to handle (show warning dialog)
              throw new Error(
                `${product.name}: ${fefoError.message}. ` +
                `Requiere confirmación para vender lotes vencidos.`
              )
            }
            throw fefoError
          }
        }

        // Decrement product stock (aggregated)
        await manager.decrement(
          Product,
          { id: item.productId! },
          'currentStock',
          item.quantity
        )
      }

      // Step 6: Mark sale as completed
      await manager.update(Sale, { id: saleId }, {
        status: SaleStatus.COMPLETED,
        completedAt: new Date(),
      })

      return { id: saleId }
    })

    // Fetch complete sale with relations
    const completeSale = await dataSource.getRepository(Sale).findOne({
      where: { id: sale.id },
      relations: ['items', 'cashier'],
    })

    // Create digital invoice automatically
    let invoiceUrl: string | undefined
    try {
      const invoiceRepo = dataSource.getRepository(DigitalInvoice)
      const invoice = invoiceRepo.create({
        saleId: sale.id,
        storeId,
        invoiceNumber: `INV-${sale.id.substring(0, 8).toUpperCase()}`,
      })
      await invoiceRepo.save(invoice)

      // Generate public URL
      const baseUrl = getBaseUrl(request)
      invoiceUrl = `${baseUrl}/invoice/${invoice.accessToken}`
    } catch (invoiceError) {
      console.error('Failed to create digital invoice:', invoiceError)
      // Don't fail the sale if invoice creation fails
    }

    return NextResponse.json({ ...completeSale, invoiceUrl }, { status: 201 })
  } catch (error) {
    console.error('Create sale error:', error)

    if (error instanceof Error) {
      if (error.message.includes('Insufficient stock') || error.message.includes('Stock insuficiente')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Invalid input data', details: error },
          { status: 400 }
        )
      }

      if (error.name === 'ForbiddenError') {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }

      if (error.name === 'UnauthorizedError') {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }

      // Return the actual error message so it appears in the POS indicator
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { error: 'Failed to create sale' },
      { status: 500 }
    )
  }
}
