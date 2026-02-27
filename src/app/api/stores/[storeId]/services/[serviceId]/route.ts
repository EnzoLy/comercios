import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Service } from '@/lib/db/entities/service.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { updateServiceSchema } from '@/lib/validations/service.schema'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string; serviceId: string }> }
) {
  try {
    const { storeId, serviceId } = await params
    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const serviceRepo = dataSource.getRepository(Service)

    const service = await serviceRepo.findOne({
      where: { id: serviceId, storeId },
      relations: ['category'],
    })

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    return NextResponse.json(service)
  } catch (error) {
    console.error('Get service error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch service' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string; serviceId: string }> }
) {
  try {
    const { storeId, serviceId } = await params
    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const body = await request.json()
    const validated = updateServiceSchema.parse(body)

    const dataSource = await getDataSource()
    const serviceRepo = dataSource.getRepository(Service)

    const service = await serviceRepo.findOne({
      where: { id: serviceId, storeId },
    })

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Build update data, converting empty strings to null and removing undefined values
    const updateData: any = {}

    for (const [key, value] of Object.entries(validated)) {
      if (value === undefined) continue
      if (value === '') {
        updateData[key] = null
      } else {
        updateData[key] = value
      }
    }

    await serviceRepo.update({ id: serviceId }, updateData)

    const updated = await serviceRepo.findOne({
      where: { id: serviceId },
      relations: ['category'],
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update service error:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update service' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ storeId: string; serviceId: string }> }
) {
  try {
    const { storeId, serviceId } = await params
    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const dataSource = await getDataSource()
    const serviceRepo = dataSource.getRepository(Service)
    const saleItemRepo = dataSource.getRepository('SaleItem')

    const service = await serviceRepo.findOne({
      where: { id: serviceId, storeId },
    })

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Check if service is referenced in any sales
    const saleItemCount = await saleItemRepo
      .createQueryBuilder('saleItem')
      .where('saleItem.serviceId = :serviceId', { serviceId })
      .getCount()

    if (saleItemCount > 0) {
      // Service has sales history - use soft delete
      await serviceRepo.update({ id: serviceId }, { isActive: false })
    } else {
      // No sales history - hard delete
      await serviceRepo.delete({ id: serviceId })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete service error:', error)
    return NextResponse.json(
      { error: 'Failed to delete service' },
      { status: 500 }
    )
  }
}
