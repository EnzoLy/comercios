import { NextResponse } from 'next/server'
import {
  requireStoreAccess,
  getUserIdFromHeaders,
} from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { EmployeeShift, ShiftStatus } from '@/lib/db/entities/employee-shift.entity'
import { Employment } from '@/lib/db/entities/employment.entity'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId: paramStoreId } = await params
    const storeId = paramStoreId

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    await requireStoreAccess(storeId)

    let userId = getUserIdFromHeaders(request)

    if (!userId) {
      const { auth } = await import('@/lib/auth/auth')
      const session = await auth()
      userId = session?.user?.id || null
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Check if there's an activeUserId in query params (for multi-user PC scenario)
    const url = new URL(request.url)
    const activeUserId = url.searchParams.get('activeUserId')
    const filterUserId = activeUserId || userId

    const dataSource = await getDataSource()

    // Get today's date in YYYY-MM-DD format
    const today = new Date()
    const todayString = today.toISOString().split('T')[0]

    console.log(`Fetching shifts for store ${storeId}, filterUserId: ${filterUserId}, activeUserId: ${activeUserId}, sessionUserId: ${userId}`)
    if (activeUserId) {
      console.log(`Active user override: ${activeUserId}`)
    }

    // Get shifts for the filtered user for today
    // If activeUserId is provided, show shifts for that user
    // Otherwise show shifts for the current user
    // Also include other available shifts in the store for shift switching
    const [userShifts, otherShifts] = await Promise.all([
      // Get shifts for the active/filtered user
      dataSource
        .getRepository(EmployeeShift)
        .createQueryBuilder('shift')
        .leftJoinAndSelect('shift.employee', 'employee')
        .where('shift.storeId = :storeId', { storeId })
        .andWhere('shift.employeeId = :employeeId', { employeeId: filterUserId })
        .andWhere('shift.status = :status', { status: ShiftStatus.ACTIVE })
        .andWhere(
          '(shift.type = :regularType) OR (shift.type = :specialType AND shift.date <= :todayString AND (shift.endDate IS NULL OR shift.endDate >= :todayString))',
          { regularType: 'REGULAR', specialType: 'SPECIAL', todayString }
        )
        .orderBy('shift.startTime', 'ASC')
        .getMany(),

      // Get shifts for other employees in the store (for switching)
      dataSource
        .getRepository(EmployeeShift)
        .createQueryBuilder('shift')
        .leftJoinAndSelect('shift.employee', 'employee')
        .where('shift.storeId = :storeId', { storeId })
        .andWhere('shift.employeeId != :employeeId', { employeeId: filterUserId })
        .andWhere('shift.status = :status', { status: ShiftStatus.ACTIVE })
        .andWhere(
          '(shift.type = :regularType) OR (shift.type = :specialType AND shift.date <= :todayString AND (shift.endDate IS NULL OR shift.endDate >= :todayString))',
          { regularType: 'REGULAR', specialType: 'SPECIAL', todayString }
        )
        .orderBy('shift.startTime', 'ASC')
        .getMany(),
    ])

    // Combine: user's shifts first, then other shifts available for switching
    const shifts = [...userShifts, ...otherShifts]

    console.log(`Found ${shifts.length} total shifts for store ${storeId}`)
    console.log(`User shifts for ${filterUserId}: ${userShifts.length}`)
    console.log(`Other shifts: ${otherShifts.length}`)

    if (userShifts.length === 0) {
      console.warn(`No shifts found for filterUserId ${filterUserId}`)
    }

    if (shifts.length > 0) {
      console.log(`First shift employee: ${shifts[0].employeeId}`)
    }

    // Enrich shifts with employmentId
    const employmentRepo = dataSource.getRepository(Employment)
    const enrichedShifts = await Promise.all(
      shifts.map(async (shift) => {
        const employment = await employmentRepo.findOne({
          where: {
            userId: shift.employeeId,
            storeId: shift.storeId,
            isActive: true,
          },
        })
        return {
          ...shift,
          employmentId: employment?.id || null,
        }
      })
    )

    return NextResponse.json(enrichedShifts)
  } catch (error) {
    console.error('Get today shifts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch today shifts' },
      { status: 500 }
    )
  }
}
