import { NextResponse } from 'next/server'
import {
  requireStoreAccess,
  requireRole,
  getStoreIdFromHeaders,
} from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { EmployeeShift, ShiftStatus } from '@/lib/db/entities/employee-shift.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'

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
    const date = searchParams.get('date')
    const employeeId = searchParams.get('employeeId')

    const dataSource = await getDataSource()
    let query = dataSource
      .getRepository(EmployeeShift)
      .createQueryBuilder('shift')
      .leftJoinAndSelect('shift.employee', 'employee')
      .where('shift.storeId = :storeId', { storeId })

    if (date) {
      query = query.andWhere('shift.date = :date', { date })
    }

    if (employeeId) {
      query = query.andWhere('shift.employeeId = :employeeId', { employeeId })
    }

    const shifts = await query
      .orderBy('shift.date', 'DESC')
      .addOrderBy('shift.startTime', 'ASC')
      .getMany()

    return NextResponse.json(shifts)
  } catch (error) {
    console.error('Get employee shifts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee shifts' },
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
    const storeId = paramStoreId

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    // Only admins/managers can create shifts
    await requireRole(storeId, [
      EmploymentRole.ADMIN,
      EmploymentRole.MANAGER,
    ])

    const body = await request.json()
    const { employeeId, date, startTime, endTime, type, endDate, notes } = body

    if (!employeeId || !date || !startTime) {
      return NextResponse.json(
        { error: 'Missing required fields: employeeId, date, startTime' },
        { status: 400 }
      )
    }

    if (type === 'SPECIAL' && !endDate) {
      return NextResponse.json(
        { error: 'endDate is required for SPECIAL type shifts' },
        { status: 400 }
      )
    }

    const dataSource = await getDataSource()

    const shift = dataSource.getRepository(EmployeeShift).create({
      storeId,
      employeeId,
      date: new Date(date),
      startTime,
      endTime,
      type: type || 'REGULAR',
      endDate: endDate ? new Date(endDate) : undefined,
      status: ShiftStatus.ACTIVE,
      notes,
    })

    await dataSource.getRepository(EmployeeShift).save(shift)

    return NextResponse.json(shift, { status: 201 })
  } catch (error) {
    console.error('Create employee shift error:', error)
    return NextResponse.json(
      { error: 'Failed to create employee shift' },
      { status: 500 }
    )
  }
}
