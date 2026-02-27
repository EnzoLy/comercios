import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { ServiceCategory } from '@/lib/db/entities/service-category.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { createServiceCategorySchema } from '@/lib/validations/service.schema'

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

    const dataSource = await getDataSource()
    const categoryRepo = dataSource.getRepository(ServiceCategory)

    const categories = await categoryRepo.find({
      where: { storeId },
      relations: ['services'],
      order: { createdAt: 'DESC' },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Get service categories error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch service categories' },
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
    const validated = createServiceCategorySchema.parse(body)

    const dataSource = await getDataSource()
    const categoryRepo = dataSource.getRepository(ServiceCategory)

    // Check for duplicate name in same store
    const existing = await categoryRepo.findOne({
      where: { storeId, name: validated.name },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Category name already exists in this store' },
        { status: 400 }
      )
    }

    const category = new ServiceCategory()
    Object.assign(category, validated)
    category.storeId = storeId

    await categoryRepo.save(category)

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Create service category error:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create service category' },
      { status: 500 }
    )
  }
}
