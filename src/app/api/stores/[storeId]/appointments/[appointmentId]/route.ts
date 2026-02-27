import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { ServiceAppointment } from '@/lib/db/entities/service-appointment.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { updateServiceAppointmentSchema } from '@/lib/validations/service.schema'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string; appointmentId: string }> }
) {
  try {
    const { storeId, appointmentId } = await params
    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const appointmentRepo = dataSource.getRepository(ServiceAppointment)

    const appointment = await appointmentRepo.findOne({
      where: { id: appointmentId, storeId },
      relations: ['service'],
    })

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    return NextResponse.json(appointment)
  } catch (error) {
    console.error('Get appointment error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch appointment' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string; appointmentId: string }> }
) {
  try {
    const { storeId, appointmentId } = await params
    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const body = await request.json()
    const validated = updateServiceAppointmentSchema.parse(body)

    const dataSource = await getDataSource()
    const appointmentRepo = dataSource.getRepository(ServiceAppointment)

    const appointment = await appointmentRepo.findOne({
      where: { id: appointmentId, storeId },
    })

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    const updateData: any = {}

    for (const [key, value] of Object.entries(validated)) {
      if (value === undefined) continue
      if (value === '') {
        updateData[key] = null
      } else {
        updateData[key] = value
      }
    }

    await appointmentRepo.update({ id: appointmentId }, updateData)

    const updated = await appointmentRepo.findOne({
      where: { id: appointmentId },
      relations: ['service'],
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update appointment error:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ storeId: string; appointmentId: string }> }
) {
  try {
    const { storeId, appointmentId } = await params
    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const dataSource = await getDataSource()
    const appointmentRepo = dataSource.getRepository(ServiceAppointment)

    const appointment = await appointmentRepo.findOne({
      where: { id: appointmentId, storeId },
    })

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    await appointmentRepo.delete({ id: appointmentId })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete appointment error:', error)
    return NextResponse.json(
      { error: 'Failed to delete appointment' },
      { status: 500 }
    )
  }
}
