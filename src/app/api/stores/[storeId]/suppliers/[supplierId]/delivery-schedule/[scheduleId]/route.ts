import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { SupplierDeliverySchedule } from '@/lib/db/entities/supplier-delivery-schedule.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { updateDeliveryScheduleSchema } from '@/lib/validations/supplier-delivery-schedule.schema'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string; supplierId: string; scheduleId: string }> }
) {
  try {
    const { storeId, supplierId, scheduleId } = await params

    if (!storeId || !supplierId || !scheduleId) {
      return NextResponse.json({ error: 'Store ID, Supplier ID, and Schedule ID required' }, { status: 400 })
    }

    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const scheduleRepo = dataSource.getRepository(SupplierDeliverySchedule)

    const schedule = await scheduleRepo.findOne({
      where: { id: scheduleId, supplierId, storeId },
    })

    if (!schedule) {
      return NextResponse.json(
        { error: 'Delivery schedule not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(schedule)
  } catch (error) {
    console.error('Get delivery schedule error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch delivery schedule' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string; supplierId: string; scheduleId: string }> }
) {
  try {
    const { storeId, supplierId, scheduleId } = await params

    if (!storeId || !supplierId || !scheduleId) {
      return NextResponse.json({ error: 'Store ID, Supplier ID, and Schedule ID required' }, { status: 400 })
    }

    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const body = await request.json()
    const validated = updateDeliveryScheduleSchema.parse(body)

    const dataSource = await getDataSource()
    const scheduleRepo = dataSource.getRepository(SupplierDeliverySchedule)

    const schedule = await scheduleRepo.findOne({
      where: { id: scheduleId, supplierId, storeId },
    })

    if (!schedule) {
      return NextResponse.json(
        { error: 'Delivery schedule not found' },
        { status: 404 }
      )
    }

    // Update schedule
    Object.assign(schedule, validated)
    await scheduleRepo.save(schedule)

    return NextResponse.json(schedule)
  } catch (error: any) {
    console.error('Update delivery schedule error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update delivery schedule' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ storeId: string; supplierId: string; scheduleId: string }> }
) {
  try {
    const { storeId, supplierId, scheduleId } = await params

    if (!storeId || !supplierId || !scheduleId) {
      return NextResponse.json({ error: 'Store ID, Supplier ID, and Schedule ID required' }, { status: 400 })
    }

    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const dataSource = await getDataSource()
    const scheduleRepo = dataSource.getRepository(SupplierDeliverySchedule)

    const schedule = await scheduleRepo.findOne({
      where: { id: scheduleId, supplierId, storeId },
    })

    if (!schedule) {
      return NextResponse.json(
        { error: 'Delivery schedule not found' },
        { status: 404 }
      )
    }

    await scheduleRepo.remove(schedule)

    return NextResponse.json({ success: true, message: 'Delivery schedule deleted successfully' })
  } catch (error) {
    console.error('Delete delivery schedule error:', error)
    return NextResponse.json(
      { error: 'Failed to delete delivery schedule' },
      { status: 500 }
    )
  }
}
