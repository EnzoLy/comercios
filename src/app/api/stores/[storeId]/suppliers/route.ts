import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { createSupplierSchema, supplierQuerySchema } from '@/lib/validations/supplier.schema'
import { Like } from 'typeorm'

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
    const validated = supplierQuerySchema.parse(queryParams)

    const dataSource = await getDataSource()
    const supplierRepo = dataSource.getRepository(Supplier)

    let query = supplierRepo
      .createQueryBuilder('supplier')
      .where('supplier.storeId = :storeId', { storeId })

    // Apply filters
    if (validated.search) {
      query = query.andWhere(
        '(supplier.name ILIKE :search OR supplier.city ILIKE :search OR supplier.state ILIKE :search)',
        { search: `%${validated.search}%` }
      )
    }

    if (validated.city) {
      query = query.andWhere('supplier.city = :city', { city: validated.city })
    }

    if (validated.state) {
      query = query.andWhere('supplier.state = :state', { state: validated.state })
    }

    if (validated.isActive && validated.isActive !== 'all') {
      query = query.andWhere('supplier.isActive = :isActive', {
        isActive: validated.isActive === 'true'
      })
    }

    if (validated.isPreferred) {
      query = query.andWhere('supplier.isPreferred = :isPreferred', {
        isPreferred: validated.isPreferred === 'true'
      })
    }

    // Apply sorting
    const sortField = `supplier.${validated.sortBy}`
    query = query.orderBy(sortField, validated.sortOrder.toUpperCase() as 'ASC' | 'DESC')

    // Apply pagination
    const skip = (validated.page - 1) * validated.limit
    query = query.skip(skip).take(validated.limit)

    const [suppliers, total] = await query.getManyAndCount()

    return NextResponse.json({
      data: suppliers,
      pagination: {
        page: validated.page,
        limit: validated.limit,
        total,
        totalPages: Math.ceil(total / validated.limit),
      }
    })
  } catch (error) {
    console.error('Get suppliers error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
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
    const validated = createSupplierSchema.parse(body)

    const dataSource = await getDataSource()
    const supplierRepo = dataSource.getRepository(Supplier)

    // Check for duplicate name in same store
    const existingSupplier = await supplierRepo.findOne({
      where: { storeId, name: validated.name },
    })

    if (existingSupplier) {
      return NextResponse.json(
        { error: 'Supplier with this name already exists in this store' },
        { status: 400 }
      )
    }

    // Create supplier
    const supplier = supplierRepo.create({
      ...validated,
      storeId,
    })

    await supplierRepo.save(supplier)

    return NextResponse.json(supplier, { status: 201 })
  } catch (error: any) {
    console.error('Create supplier error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create supplier' },
      { status: 500 }
    )
  }
}
