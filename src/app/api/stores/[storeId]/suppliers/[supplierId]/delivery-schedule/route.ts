import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { SupplierDeliverySchedule } from '@/lib/db/entities/supplier-delivery-schedule.entity'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { createDeliveryScheduleSchema } from '@/lib/validations/supplier-delivery-schedule.schema'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string; supplierId: string }> }
) {
  try {
    const { storeId, supplierId } = await params

    if (!storeId || !supplierId) {
      return NextResponse.json({ error: 'Store ID and Supplier ID required' }, { status: 400 })
    }

    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const scheduleRepo = dataSource.getRepository(SupplierDeliverySchedule)

    const schedules = await scheduleRepo.find({
      where: { supplierId, storeId },
      order: { dayOfWeek: 'ASC', deliveryTime: 'ASC' },
    })

    return NextResponse.json(schedules)
  } catch (error) {
    console.error('Get delivery schedules error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch delivery schedules' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string; supplierId: string }> }
) {
  try {
    const { storeId, supplierId } = await params

    if (!storeId || !supplierId) {
      return NextResponse.json({ error: 'Store ID and Supplier ID required' }, { status: 400 })
    }

    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const body = await request.json()
    const validated = createDeliveryScheduleSchema.parse(body)

    const dataSource = await getDataSource()
    const supplierRepo = dataSource.getRepository(Supplier)
    const scheduleRepo = dataSource.getRepository(SupplierDeliverySchedule)

    // Verify supplier exists
    const supplier = await supplierRepo.findOne({
      where: { id: supplierId, storeId },
    })

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    // Create delivery schedule
    const schedule = scheduleRepo.create({
      ...validated,
      supplierId,
      storeId,
    })

    await scheduleRepo.save(schedule)

    return NextResponse.json(schedule, { status: 201 })
  } catch (error: any) {
    console.error('Create delivery schedule error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create delivery schedule' },
      { status: 500 }
    )
  }
}
