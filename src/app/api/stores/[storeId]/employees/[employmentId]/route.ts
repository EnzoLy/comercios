import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole, isStoreOwner } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Employment, EmploymentRole } from '@/lib/db/entities/employment.entity'
import { updateEmploymentSchema } from '@/lib/validations/employee.schema'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string; employmentId: string }> }
) {
  try {
    const { storeId, employmentId } = await params
    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const employmentRepo = dataSource.getRepository(Employment)

    const employment = await employmentRepo.findOne({
      where: { id: employmentId, storeId },
      relations: ['user', 'store'],
    })

    if (!employment) {
      return NextResponse.json({ error: 'Employment not found' }, { status: 404 })
    }

    return NextResponse.json(employment)
  } catch (error) {
    console.error('Get employment error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employment' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string; employmentId: string }> }
) {
  try {
    const { storeId, employmentId } = await params

    // Only admins and owners can update employments
    const owner = await isStoreOwner(storeId)
    if (!owner) {
      await requireRole(storeId, [EmploymentRole.ADMIN])
    }

    const body = await request.json()
    const validated = updateEmploymentSchema.parse(body)

    const dataSource = await getDataSource()
    const employmentRepo = dataSource.getRepository(Employment)

    const employment = await employmentRepo.findOne({
      where: { id: employmentId, storeId },
    })

    if (!employment) {
      return NextResponse.json({ error: 'Employment not found' }, { status: 404 })
    }

    // Update fields
    if (validated.role !== undefined) {
      employment.role = validated.role
    }
    if (validated.isActive !== undefined) {
      employment.isActive = validated.isActive
      if (!validated.isActive && !employment.endDate) {
        employment.endDate = new Date()
      }
    }
    if (validated.endDate !== undefined) {
      employment.endDate = validated.endDate ? new Date(validated.endDate) : undefined
    }

    await employmentRepo.save(employment)

    const updated = await employmentRepo.findOne({
      where: { id: employmentId },
      relations: ['user', 'store'],
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update employment error:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update employment' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ storeId: string; employmentId: string }> }
) {
  try {
    const { storeId, employmentId } = await params

    // Only admins and owners can delete employments
    const owner = await isStoreOwner(storeId)
    if (!owner) {
      await requireRole(storeId, [EmploymentRole.ADMIN])
    }

    const dataSource = await getDataSource()
    const employmentRepo = dataSource.getRepository(Employment)

    const employment = await employmentRepo.findOne({
      where: { id: employmentId, storeId },
    })

    if (!employment) {
      return NextResponse.json({ error: 'Employment not found' }, { status: 404 })
    }

    // Soft delete - mark as inactive
    employment.isActive = false
    employment.endDate = new Date()
    await employmentRepo.save(employment)

    return NextResponse.json({ message: 'Employment ended successfully' })
  } catch (error) {
    console.error('Delete employment error:', error)
    return NextResponse.json(
      { error: 'Failed to end employment' },
      { status: 500 }
    )
  }
}
