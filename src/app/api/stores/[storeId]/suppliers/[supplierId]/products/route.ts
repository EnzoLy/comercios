import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { SupplierProduct } from '@/lib/db/entities/supplier-product.entity'
import { SupplierProductPrice } from '@/lib/db/entities/supplier-product-price.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { addProductToSupplierSchema } from '@/lib/validations/supplier-product-price.schema'
import { IsNull } from 'typeorm'

export async function GET(
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

    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const supplierProductRepo = dataSource.getRepository(SupplierProduct)

    // Verify supplier exists and belongs to store
    const supplierRepo = dataSource.getRepository(Supplier)
    const supplier = await supplierRepo.findOne({
      where: { id: supplierId, storeId },
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Get all products for this supplier with product details and current price
    const supplierProducts = await supplierProductRepo
      .createQueryBuilder('sp')
      .leftJoinAndSelect('sp.product', 'product')
      .leftJoinAndSelect(
        'product.category',
        'category'
      )
      .leftJoin(
        SupplierProductPrice,
        'price',
        'price.supplierId = sp.supplierId AND price.productId = sp.productId AND price.endDate IS NULL'
      )
      .addSelect([
        'price.id',
        'price.price',
        'price.currency',
        'price.effectiveDate',
        'price.sku',
        'price.minimumOrderQuantity',
        'price.packSize',
      ])
      .where('sp.supplierId = :supplierId', { supplierId })
      .andWhere('sp.storeId = :storeId', { storeId })
      .orderBy('product.name', 'ASC')
      .getMany()

    // Transform to include current price in a cleaner format
    const productsWithPrices = await Promise.all(
      supplierProducts.map(async (sp) => {
        const priceRepo = dataSource.getRepository(SupplierProductPrice)
        const currentPrice = await priceRepo.findOne({
          where: {
            supplierId,
            productId: sp.productId,
            endDate: IsNull(),
          },
        })

        return {
          ...sp,
          currentPrice,
        }
      })
    )

    return NextResponse.json({ data: productsWithPrices })
  } catch (error) {
    console.error('Get supplier products error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch supplier products' },
      { status: 500 }
    )
  }
}

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
    const validated = addProductToSupplierSchema.parse(body)

    const dataSource = await getDataSource()
    const supplierProductRepo = dataSource.getRepository(SupplierProduct)
    const productRepo = dataSource.getRepository(Product)
    const supplierRepo = dataSource.getRepository(Supplier)

    // Verify supplier exists and belongs to store
    const supplier = await supplierRepo.findOne({
      where: { id: supplierId, storeId },
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Verify product exists and belongs to store
    const product = await productRepo.findOne({
      where: { id: validated.productId, storeId },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Check if product is already associated with this supplier
    const existingAssociation = await supplierProductRepo.findOne({
      where: { supplierId, productId: validated.productId, storeId },
    })

    if (existingAssociation) {
      return NextResponse.json(
        { error: 'Product is already associated with this supplier' },
        { status: 400 }
      )
    }

    // Create supplier-product association
    const supplierProduct = supplierProductRepo.create({
      supplierId,
      productId: validated.productId,
      storeId,
      supplierSku: validated.supplierSku,
      isPreferred: validated.isPreferred,
      notes: validated.notes,
      isActive: true,
    })

    await supplierProductRepo.save(supplierProduct)

    // If initial price provided, create price record
    let priceRecord = null
    if (validated.initialPrice !== undefined) {
      const priceRepo = dataSource.getRepository(SupplierProductPrice)
      priceRecord = priceRepo.create({
        supplierId,
        productId: validated.productId,
        storeId,
        price: validated.initialPrice,
        currency: 'USD',
        effectiveDate: new Date(),
        endDate: undefined, // Current price
        sku: validated.supplierSku,
        hasAlert: false,
      })

      await priceRepo.save(priceRecord)
    }

    // Return with product details
    const result = await supplierProductRepo.findOne({
      where: { id: supplierProduct.id },
      relations: ['product'],
    })

    return NextResponse.json(
      {
        ...result,
        currentPrice: priceRecord,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Add product to supplier error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to add product to supplier' },
      { status: 500 }
    )
  }
}
