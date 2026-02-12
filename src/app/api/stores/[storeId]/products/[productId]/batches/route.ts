import { NextResponse } from 'next/server'
import { requireRole, getUserIdFromHeaders } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Product } from '@/lib/db/entities/product.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { createBatchSchema, batchQuerySchema } from '@/lib/validations/batch.schema'
import { BatchManagementService } from '@/lib/services/batch-management.service'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string; productId: string }> }
) {
  try {
    const { storeId, productId } = await params

    if (!storeId || !productId) {
      return NextResponse.json(
        { error: 'Store ID and Product ID required' },
        { status: 400 }
      )
    }

    await requireRole(storeId, [
      EmploymentRole.ADMIN,
      EmploymentRole.MANAGER,
      EmploymentRole.STOCK_KEEPER,
    ])

    // Verificar que el producto existe y pertenece al store
    const dataSource = await getDataSource()
    const product = await dataSource.getRepository(Product).findOne({
      where: { id: productId, storeId },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (!product.trackExpirationDates) {
      return NextResponse.json(
        { error: 'Product does not track expiration dates' },
        { status: 400 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryData = {
      showExpired: searchParams.get('showExpired'),
      expiringInDays: searchParams.get('expiringInDays'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    }

    const validated = batchQuerySchema.parse(queryData)

    const batchService = new BatchManagementService()

    return dataSource.transaction(async (manager) => {
      const { batches, total } = await batchService.getBatchesByProduct(
        {
          productId,
          showExpired: validated.showExpired,
          expiringInDays: validated.expiringInDays,
          skip: (validated.page - 1) * validated.limit,
          take: validated.limit,
          sortBy: validated.sortBy,
          sortOrder: validated.sortOrder.toUpperCase() as 'ASC' | 'DESC',
        },
        manager
      )

      return NextResponse.json(
        {
          batches,
          total,
          page: validated.page,
          limit: validated.limit,
          totalPages: Math.ceil(total / validated.limit),
        },
        { status: 200 }
      )
    })
  } catch (error: any) {
    console.error('Get batches error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string; productId: string }> }
) {
  try {
    const { storeId, productId } = await params

    if (!storeId || !productId) {
      return NextResponse.json(
        { error: 'Store ID and Product ID required' },
        { status: 400 }
      )
    }

    await requireRole(storeId, [
      EmploymentRole.ADMIN,
      EmploymentRole.MANAGER,
      EmploymentRole.STOCK_KEEPER,
    ])

    let userId: string | undefined = getUserIdFromHeaders(request) ?? undefined

    if (!userId) {
      const { auth } = await import('@/lib/auth/auth')
      const session = await auth()
      const sessionUserId = session?.user?.id

      if (!sessionUserId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 })
      }
      userId = sessionUserId
    }

    const body = await request.json()
    const validated = createBatchSchema.parse(body)

    // Verificar que productId coincide
    if (validated.productId !== productId) {
      return NextResponse.json(
        { error: 'Product ID mismatch' },
        { status: 400 }
      )
    }

    const dataSource = await getDataSource()

    // Verificar que el producto existe y pertenece al store
    const product = await dataSource.getRepository(Product).findOne({
      where: { id: productId, storeId },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (!product.trackExpirationDates) {
      return NextResponse.json(
        { error: 'Product does not track expiration dates' },
        { status: 400 }
      )
    }

    const batchService = new BatchManagementService()

    const batch = await dataSource.transaction(async (manager) => {
      return batchService.createBatch(
        {
          productId: validated.productId,
          batchNumber: validated.batchNumber,
          expirationDate: new Date(validated.expirationDate),
          initialQuantity: validated.initialQuantity,
          unitCost: validated.unitCost,
          purchaseOrderId: validated.purchaseOrderId,
          purchaseOrderItemId: validated.purchaseOrderItemId,
          userId,
        },
        manager
      )
    })

    return NextResponse.json(batch, { status: 201 })
  } catch (error: any) {
    console.error('Create batch error:', error)

    if (error instanceof Error) {
      if (
        error.message.includes('no encontrado') ||
        error.message.includes('not found') ||
        error.message.includes('not track')
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

    return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 })
  }
}
