import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Category } from '@/lib/db/entities/category.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { updateCategorySchema } from '@/lib/validations/category.schema'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string; categoryId: string }> }
) {
  try {
    const { storeId, categoryId } = await params
    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const categoryRepo = dataSource.getRepository(Category)

    const category = await categoryRepo.findOne({
      where: { id: categoryId, storeId },
      relations: ['parent', 'products'],
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error('Get category error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch category' },
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
    const validated = updateCategorySchema.parse(body)

    const dataSource = await getDataSource()
    const categoryRepo = dataSource.getRepository(Category)

    const category = await categoryRepo.findOne({
      where: { id: categoryId, storeId },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Check for duplicate name if name is being changed
    if (validated.name && validated.name !== category.name) {
      const existing = await categoryRepo.findOne({
        where: {
          storeId,
          name: validated.name,
          parentId: validated.parentId !== undefined ? validated.parentId : category.parentId,
        },
      })

      if (existing && existing.id !== categoryId) {
        return NextResponse.json(
          { error: 'Category name already exists' },
          { status: 400 }
        )
      }
    }

    // Prevent setting parent to self or creating circular reference
    if (validated.parentId && validated.parentId === categoryId) {
      return NextResponse.json(
        { error: 'Category cannot be its own parent' },
        { status: 400 }
      )
    }

    await categoryRepo.update({ id: categoryId }, validated)

    const updated = await categoryRepo.findOne({
      where: { id: categoryId },
      relations: ['parent'],
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update category error:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update category' },
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
    const categoryRepo = dataSource.getRepository(Category)
    const productRepo = dataSource.getRepository(Product)

    const category = await categoryRepo.findOne({
      where: { id: categoryId, storeId },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Check if category has products
    const productCount = await productRepo.count({
      where: { categoryId },
    })

    if (productCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with ${productCount} products` },
        { status: 400 }
      )
    }

    // Check if category has children by querying for categories with this as parent
    const childCount = await categoryRepo.count({
      where: { parentId: categoryId },
    })

    if (childCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with subcategories' },
        { status: 400 }
      )
    }

    await categoryRepo.delete({ id: categoryId })

    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (error) {
    console.error('Delete category error:', error)
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}
