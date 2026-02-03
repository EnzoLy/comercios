import { NextResponse } from 'next/server'
import {
  requireStoreAccess,
  requireRole,
  getStoreIdFromHeaders,
} from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { EmployeeShift } from '@/lib/db/entities/employee-shift.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ storeId: string; shiftId: string }> }
) {
  try {
    const { storeId: paramStoreId, shiftId } = await params
    const storeId = paramStoreId

    if (!storeId || !shiftId) {
      return NextResponse.json({ error: 'Store ID and Shift ID required' }, { status: 400 })
    }

    // Only admins/managers can update shifts
    await requireRole(storeId, [
      EmploymentRole.ADMIN,
      EmploymentRole.MANAGER,
    ])

    const body = await request.json()
    const { startTime, endTime, type, endDate, notes, status } = body

    const dataSource = await getDataSource()
    const shift = await dataSource.getRepository(EmployeeShift).findOne({
      where: { id: shiftId, storeId },
    })

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    if (startTime) shift.startTime = startTime
    if (endTime !== undefined) shift.endTime = endTime
    if (type) shift.type = type
    if (endDate !== undefined) shift.endDate = endDate ? new Date(endDate) : undefined
    if (notes !== undefined) shift.notes = notes
    if (status) shift.status = status

    await dataSource.getRepository(EmployeeShift).save(shift)

    return NextResponse.json(shift)
  } catch (error) {
    console.error('Update employee shift error:', error)
    return NextResponse.json(
      { error: 'Failed to update employee shift' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ storeId: string; shiftId: string }> }
) {
  try {
    const { storeId: paramStoreId, shiftId } = await params
    const storeId = paramStoreId

    if (!storeId || !shiftId) {
      return NextResponse.json({ error: 'Store ID and Shift ID required' }, { status: 400 })
    }

    // Only admins/managers can delete shifts
    await requireRole(storeId, [
      EmploymentRole.ADMIN,
      EmploymentRole.MANAGER,
    ])

    const dataSource = await getDataSource()
    const shift = await dataSource.getRepository(EmployeeShift).findOne({
      where: { id: shiftId, storeId },
    })

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    await dataSource.getRepository(EmployeeShift).delete(shiftId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete employee shift error:', error)
    return NextResponse.json(
      { error: 'Failed to delete employee shift' },
      { status: 500 }
    )
  }
}
