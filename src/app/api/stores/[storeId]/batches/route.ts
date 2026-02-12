import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { ProductBatch } from '@/lib/db/entities/product-batch.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { MoreThan } from 'typeorm'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID required' },
        { status: 400 }
      )
    }

    await requireRole(storeId, [
      EmploymentRole.ADMIN,
      EmploymentRole.MANAGER,
      EmploymentRole.STOCK_KEEPER,
    ])

    const { searchParams } = new URL(request.url)
    const showExpired = searchParams.get('showExpired') === 'true'
    const expiringInDays = searchParams.get('expiringInDays')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const dataSource = await getDataSource()
    const batchRepo = dataSource.getRepository(ProductBatch)

    // Construir query
    const queryBuilder = batchRepo
      .createQueryBuilder('batch')
      .innerJoinAndSelect('batch.product', 'product')
      .where('product.storeId = :storeId', { storeId })
      .andWhere('product.trackExpirationDates = :track', { track: true })
      .orderBy('batch.expirationDate', 'ASC')

    const now = new Date()

    // Aplicar filtros
    if (!showExpired) {
      queryBuilder.andWhere('batch.expirationDate > :now', { now })
    }

    if (expiringInDays) {
      const days = parseInt(expiringInDays)
      const futureDate = new Date(now)
      futureDate.setDate(futureDate.getDate() + days)
      queryBuilder.andWhere('batch.expirationDate <= :futureDate', { futureDate })
    }

    // Contar total
    const total = await queryBuilder.getCount()

    // Aplicar paginación
    const batches = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany()

    return NextResponse.json(
      {
        batches,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Get batches error:', error)
    return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 })
  }
}
