import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { ServiceCategory } from '@/lib/db/entities/service-category.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { updateServiceCategorySchema } from '@/lib/validations/service.schema'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string; categoryId: string }> }
) {
  try {
    const { storeId, categoryId } = await params
    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const categoryRepo = dataSource.getRepository(ServiceCategory)

    const category = await categoryRepo.findOne({
      where: { id: categoryId, storeId },
      relations: ['services'],
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error('Get service category error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch service category' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string; categoryId: string }> }
) {
  try {
    const { storeId, categoryId } = await params
    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const body = await request.json()
    const validated = updateServiceCategorySchema.parse(body)

    const dataSource = await getDataSource()
    const categoryRepo = dataSource.getRepository(ServiceCategory)

    const category = await categoryRepo.findOne({
      where: { id: categoryId, storeId },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Check for duplicate name if updating
    if (validated.name && validated.name !== category.name) {
      const existing = await categoryRepo.findOne({
        where: { storeId, name: validated.name },
      })
      if (existing && existing.id !== categoryId) {
        return NextResponse.json(
          { error: 'Category name already exists' },
          { status: 400 }
        )
      }
    }

    const updateData: any = {}
    for (const [key, value] of Object.entries(validated)) {
      if (value === undefined) continue
      updateData[key] = value
    }

    await categoryRepo.update({ id: categoryId }, updateData)

    const updated = await categoryRepo.findOne({
      where: { id: categoryId },
      relations: ['services'],
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update service category error:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update service category' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ storeId: string; categoryId: string }> }
) {
  try {
    const { storeId, categoryId } = await params
    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const dataSource = await getDataSource()
    const categoryRepo = dataSource.getRepository(ServiceCategory)

    const category = await categoryRepo.findOne({
      where: { id: categoryId, storeId },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Delete category (cascade will handle services without category)
    await categoryRepo.delete({ id: categoryId })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete service category error:', error)
    return NextResponse.json(
      { error: 'Failed to delete service category' },
      { status: 500 }
    )
  }
}
