import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { ServiceAppointment } from '@/lib/db/entities/service-appointment.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { createServiceAppointmentSchema } from '@/lib/validations/service.schema'

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
    const serviceId = searchParams.get('serviceId') || undefined
    const status = searchParams.get('status') || undefined
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined
    const sortBy = searchParams.get('sortBy') || 'scheduledAt'
    const sortOrder = (searchParams.get('sortOrder') || 'ASC').toUpperCase()
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

    const dataSource = await getDataSource()
    const appointmentRepo = dataSource.getRepository(ServiceAppointment)

    // Build query
    let query = appointmentRepo
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.service', 'service')
      .where('appointment.storeId = :storeId', { storeId })

    // Apply filters
    if (search) {
      query = query.andWhere(
        '(appointment.clientName ILIKE :search OR appointment.clientEmail ILIKE :search OR appointment.clientPhone ILIKE :search)',
        { search: `%${search}%` }
      )
    }

    if (serviceId) {
      query = query.andWhere('appointment.serviceId = :serviceId', { serviceId })
    }

    if (status) {
      query = query.andWhere('appointment.status = :status', { status })
    }

    if (dateFrom) {
      const from = new Date(dateFrom)
      query = query.andWhere('appointment.scheduledAt >= :dateFrom', {
        dateFrom: from,
      })
    }

    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      query = query.andWhere('appointment.scheduledAt <= :dateTo', { dateTo: to })
    }

    // Get total count before pagination
    const totalQuery = query.clone()
    const [_, totalCount] = await totalQuery.getManyAndCount()

    // Apply pagination and sorting
    query = query
      .orderBy(`appointment.${sortBy}`, sortOrder as 'ASC' | 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const appointments = await query.getMany()

    // Calculate if there are more pages
    const hasMore = page * pageSize < totalCount

    return NextResponse.json({
      appointments,
      total: totalCount,
      page,
      pageSize,
      hasMore,
    })
  } catch (error) {
    console.error('Get appointments error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
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
    const validated = createServiceAppointmentSchema.parse(body)

    const dataSource = await getDataSource()
    const appointmentRepo = dataSource.getRepository(ServiceAppointment)

    const appointment = new ServiceAppointment()
    Object.assign(appointment, validated)
    appointment.storeId = storeId

    await appointmentRepo.save(appointment)

    // Reload with relations
    const saved = await appointmentRepo.findOne({
      where: { id: appointment.id },
      relations: ['service'],
    })

    return NextResponse.json(saved, { status: 201 })
  } catch (error) {
    console.error('Create appointment error:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    )
  }
}
