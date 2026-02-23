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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const dataSource = await getDataSource()
    let query = dataSource
      .getRepository(EmployeeShift)
      .createQueryBuilder('shift')
      .leftJoinAndSelect('shift.employee', 'employee')
      .where('shift.storeId = :storeId', { storeId })

    if (date) {
      query = query.andWhere('shift.date = :date', { date })
    } else if (startDate && endDate) {
      // Return REGULAR shifts within the date range, and SPECIAL shifts
      // whose date range overlaps with the requested range.
      query = query.andWhere(
        `(shift.type = :regular AND shift.date >= :startDate AND shift.date <= :endDate)
         OR (shift.type = :special AND shift.date <= :endDate AND shift.endDate >= :startDate)`,
        { regular: 'REGULAR', special: 'SPECIAL', startDate, endDate }
      )
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

    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const body = await request.json()
    const { employeeId, date, startTime, endTime, type, endDate, notes, repeatWeeks } = body

    if (!employeeId || !date || (type !== 'SPECIAL' && !startTime)) {
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
    const shiftRepo = dataSource.getRepository(EmployeeShift)

    // Parse date strings as LOCAL dates to avoid UTC-midnight timezone shift
    // new Date("2026-02-23") = UTC midnight, which in UTC-3 is Feb 22 21:00 local → stores wrong day
    const parseLocalDate = (str: string) => {
      const [y, m, d] = str.split('-').map(Number)
      return new Date(y, m - 1, d)
    }

    const baseDate = parseLocalDate(date)
    const weeks = type === 'REGULAR' && repeatWeeks > 0 ? Number(repeatWeeks) : 0

    if (weeks > 0) {
      // Batch create one shift per week
      const shiftsToCreate = Array.from({ length: weeks + 1 }, (_, i) => {
        const shiftDate = new Date(baseDate)
        shiftDate.setDate(baseDate.getDate() + i * 7)
        return shiftRepo.create({
          storeId,
          employeeId,
          date: shiftDate,
          startTime: startTime || '00:00',
          endTime,
          type: type || 'REGULAR',
          status: ShiftStatus.ACTIVE,
          notes,
        })
      })
      const saved = await shiftRepo.save(shiftsToCreate)
      return NextResponse.json(saved, { status: 201 })
    }

    const shift = shiftRepo.create({
      storeId,
      employeeId,
      date: baseDate,
      startTime: startTime || '00:00',
      endTime,
      type: type || 'REGULAR',
      endDate: endDate ? parseLocalDate(endDate) : undefined,
      status: ShiftStatus.ACTIVE,
      notes,
    })

    await shiftRepo.save(shift)
    return NextResponse.json(shift, { status: 201 })
  } catch (error) {
    console.error('Create employee shift error:', error)
    return NextResponse.json(
      { error: 'Failed to create employee shift' },
      { status: 500 }
    )
  }
}
