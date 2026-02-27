import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Service } from '@/lib/db/entities/service.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { createServiceSchema } from '@/lib/validations/service.schema'

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
    const search = searchParams.get('search') || undefined
    const categoryId = searchParams.get('category') || undefined
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = (searchParams.get('sortOrder') || 'DESC').toUpperCase()
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

    const dataSource = await getDataSource()
    const serviceRepo = dataSource.getRepository(Service)

    // Build query
    let query = serviceRepo
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.category', 'category')
      .where('service.storeId = :storeId', { storeId })

    // Apply filters
    if (!includeInactive) {
      query = query.andWhere('service.isActive = :isActive', { isActive: true })
    }

    if (search) {
      query = query.andWhere(
        '(service.name ILIKE :search OR service.description ILIKE :search)',
        { search: `%${search}%` }
      )
    }

    if (categoryId) {
      query = query.andWhere('service.categoryId = :categoryId', { categoryId })
    }

    // Get total count before pagination
    const totalQuery = query.clone()
    const [_, totalCount] = await totalQuery.getManyAndCount()

    // Apply pagination and sorting
    query = query
      .orderBy(`service.${sortBy}`, sortOrder as 'ASC' | 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const services = await query.getMany()

    // Calculate if there are more pages
    const hasMore = page * pageSize < totalCount

    return NextResponse.json({
      services,
      total: totalCount,
      page,
      pageSize,
      hasMore,
    })
  } catch (error) {
    console.error('Get services error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch services' },
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

    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const body = await request.json()
    const validated = createServiceSchema.parse(body)

    const dataSource = await getDataSource()
    const serviceRepo = dataSource.getRepository(Service)

    const service = new Service()
    Object.assign(service, validated)
    service.storeId = storeId

    await serviceRepo.save(service)

    return NextResponse.json(service, { status: 201 })
  } catch (error) {
    console.error('Create service error:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create service' },
      { status: 500 }
    )
  }
}
