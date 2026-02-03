import { NextResponse } from 'next/server'
import { IsNull } from 'typeorm'
import { requireStoreAccess, requireRole, getStoreIdFromHeaders } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Category } from '@/lib/db/entities/category.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { createCategorySchema } from '@/lib/validations/category.schema'

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

    const dataSource = await getDataSource()
    const categoryRepo = dataSource.getRepository(Category)

    // Get all categories with their children
    const categories = await categoryRepo.find({
      where: { storeId },
      relations: ['parent', 'children'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Get categories error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
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
    const validated = createCategorySchema.parse(body)

    const dataSource = await getDataSource()
    const categoryRepo = dataSource.getRepository(Category)

    // Check for duplicate name in same store and parent
    const existing = await categoryRepo.findOne({
      where: {
        storeId,
        name: validated.name,
        parentId: validated.parentId ? validated.parentId : IsNull(),
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Category name already exists in this location' },
        { status: 400 }
      )
    }

    // If parentId is provided, verify it exists and belongs to this store
    if (validated.parentId) {
      const parent = await categoryRepo.findOne({
        where: { id: validated.parentId, storeId },
      })

      if (!parent) {
        return NextResponse.json(
          { error: 'Parent category not found' },
          { status: 404 }
        )
      }
    }

    const category = categoryRepo.create({
      sortOrder: 0,
      isActive: true,
      ...validated,
      storeId,
    })

    await categoryRepo.save(category)

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Create category error:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}
