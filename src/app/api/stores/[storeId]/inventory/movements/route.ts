import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole, getStoreIdFromHeaders, getUserIdFromHeaders } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { StockMovement } from '@/lib/db/entities/stock-movement.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { createStockMovementSchema } from '@/lib/validations/stock.schema'

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
    const productId = searchParams.get('productId')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')

    const dataSource = await getDataSource()
    const movementRepo = dataSource.getRepository(StockMovement)

    let query = movementRepo
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.product', 'product')
      .leftJoinAndSelect('movement.user', 'user')
      .leftJoin('product.store', 'store')
      .where('store.id = :storeId', { storeId })

    if (productId) {
      query = query.andWhere('movement.productId = :productId', { productId })
    }

    if (type) {
      query = query.andWhere('movement.type = :type', { type })
    }

    const movements = await query
      .orderBy('movement.createdAt', 'DESC')
      .take(limit)
      .getMany()

    return NextResponse.json(movements)
  } catch (error) {
    console.error('Get movements error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch movements' },
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
    ])

    const body = await request.json()
    const validated = createStockMovementSchema.parse(body)

    const dataSource = await getDataSource()

    // Use transaction for stock adjustment
    const movement = await dataSource.transaction(async (manager) => {
      // Verify product exists and belongs to store
      const product = await manager.findOne(Product, {
        where: { id: validated.productId, storeId },
      })

      if (!product) {
        throw new Error('Product not found')
      }

      // Create stock movement
      const movement = manager.create(StockMovement, {
        ...validated,
        userId,
      })

      await manager.save(movement)

      // Update product stock
      if (validated.quantity > 0) {
        // Positive quantity - increase stock
        await manager.increment(
          Product,
          { id: validated.productId },
          'currentStock',
          Math.abs(validated.quantity)
        )
      } else {
        // Negative quantity - decrease stock
        const newStock = product.currentStock + validated.quantity

        if (newStock < 0) {
          throw new Error('Insufficient stock for this adjustment')
        }

        await manager.decrement(
          Product,
          { id: validated.productId },
          'currentStock',
          Math.abs(validated.quantity)
        )
      }

      return movement
    })

    // Fetch complete movement with relations
    const completeMovement = await dataSource.getRepository(StockMovement).findOne({
      where: { id: movement.id },
      relations: ['product', 'user'],
    })

    return NextResponse.json(completeMovement, { status: 201 })
  } catch (error) {
    console.error('Create movement error:', error)

    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('Insufficient')) {
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
      { error: 'Failed to create movement' },
      { status: 500 }
    )
  }
}
