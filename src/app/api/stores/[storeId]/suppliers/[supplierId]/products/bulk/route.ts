import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { SupplierProduct } from '@/lib/db/entities/supplier-product.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { Category } from '@/lib/db/entities/category.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { bulkAddProductsByCategorySchema } from '@/lib/validations/supplier-product-price.schema'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string; supplierId: string }> }
) {
  try {
    const { storeId, supplierId } = await params

    if (!storeId || !supplierId) {
      return NextResponse.json(
        { error: 'Store ID and Supplier ID required' },
        { status: 400 }
      )
    }

    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const body = await request.json()
    const validated = bulkAddProductsByCategorySchema.parse(body)

    const dataSource = await getDataSource()
    const supplierRepo = dataSource.getRepository(Supplier)
    const categoryRepo = dataSource.getRepository(Category)
    const productRepo = dataSource.getRepository(Product)
    const supplierProductRepo = dataSource.getRepository(SupplierProduct)

    // Verify supplier exists and belongs to store
    const supplier = await supplierRepo.findOne({
      where: { id: supplierId, storeId },
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Verify category exists and belongs to store
    const category = await categoryRepo.findOne({
      where: { id: validated.categoryId, storeId },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Get all products in the category
    const products = await productRepo.find({
      where: { categoryId: validated.categoryId, storeId, isActive: true },
    })

    if (products.length === 0) {
      return NextResponse.json(
        { message: 'No active products found in this category', count: 0 },
        { status: 200 }
      )
    }

    // Get existing associations to avoid duplicates
    const existingAssociations = await supplierProductRepo.find({
      where: { supplierId, storeId },
      select: ['productId'],
    })

    const existingProductIds = new Set(
      existingAssociations.map((sp) => sp.productId)
    )

    // Filter out products already associated
    const newProducts = products.filter(
      (product) => !existingProductIds.has(product.id)
    )

    if (newProducts.length === 0) {
      return NextResponse.json(
        {
          message: 'All products in this category are already associated with this supplier',
          count: 0,
        },
        { status: 200 }
      )
    }

    // Create supplier-product associations
    const supplierProducts = newProducts.map((product) =>
      supplierProductRepo.create({
        supplierId,
        productId: product.id,
        storeId,
        supplierSku: validated.supplierSku,
        isPreferred: validated.isPreferred,
        isActive: true,
      })
    )

    await supplierProductRepo.save(supplierProducts)

    return NextResponse.json(
      {
        message: `Successfully added ${newProducts.length} products from category "${category.name}"`,
        count: newProducts.length,
        skipped: products.length - newProducts.length,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Bulk add products error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to bulk add products' },
      { status: 500 }
    )
  }
}
