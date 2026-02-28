import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole, getStoreIdFromHeaders } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Product } from '@/lib/db/entities/product.entity'
import { ProductBarcode } from '@/lib/db/entities/product-barcode.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { createProductSchema } from '@/lib/validations/product.schema'

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
    const categoryId = searchParams.get('category') || undefined
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const stockFilter = searchParams.get('stock') || undefined
    const statusFilter = searchParams.get('status') || undefined
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = (searchParams.get('sortOrder') || 'DESC').toUpperCase()
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

    const dataSource = await getDataSource()
    const productRepo = dataSource.getRepository(Product)

    // Build query
    let query = productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .leftJoinAndSelect('product.barcodes', 'barcodes')
      .where('product.storeId = :storeId', { storeId })

    // Apply filters
    if (!includeInactive) {
      query = query.andWhere('product.isActive = :isActive', { isActive: true })
    } else if (statusFilter === 'active') {
      query = query.andWhere('product.isActive = :isActive', { isActive: true })
    } else if (statusFilter === 'inactive') {
      query = query.andWhere('product.isActive = :isActive', { isActive: false })
    }

    if (search) {
      query = query.andWhere(
        '(product.name ILIKE :search OR product.sku ILIKE :search OR product.barcode ILIKE :search)',
        { search: `%${search}%` }
      )
    }

    if (categoryId) {
      query = query.andWhere('product.categoryId = :categoryId', { categoryId })
    }

    if (stockFilter === 'low') {
      query = query.andWhere('product.currentStock <= product.minStockLevel')
    } else if (stockFilter === 'out') {
      query = query.andWhere('product.currentStock = 0')
    }

    // Get total count efficiently without fetching data
    const totalCount = await query.clone().getCount()

    // Apply pagination and sorting
    query = query
      .orderBy(`product.${sortBy}`, sortOrder as 'ASC' | 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const products = await query.getMany()

    // Calculate if there are more pages
    const hasMore = page * pageSize < totalCount

    return NextResponse.json({
      products,
      total: totalCount,
      page,
      pageSize,
      hasMore
    })
  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
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
    const validated = createProductSchema.parse(body)

    const dataSource = await getDataSource()
    const productRepo = dataSource.getRepository(Product)

    // Build product data, excluding null/undefined values
    const productData: any = {}
    for (const [key, value] of Object.entries(validated)) {
      if (value === undefined) continue
      if (key === 'barcode' && value === '') continue
      if (key === 'imageUrl' && value === '') continue
      productData[key] = value
    }

    // Check for duplicate SKU or barcode in same store
    if (validated.sku) {
      const existingSku = await productRepo.findOne({
        where: { storeId, sku: validated.sku },
      })
      if (existingSku) {
        return NextResponse.json(
          { error: 'SKU already exists in this store' },
          { status: 400 }
        )
      }
    }

    if (productData.barcode) {
      const existingBarcode = await productRepo.findOne({
        where: { storeId, barcode: productData.barcode },
      })
      if (existingBarcode) {
        return NextResponse.json(
          { error: 'Barcode already exists in this store' },
          { status: 400 }
        )
      }
    }

    const product = new Product()
    Object.assign(product, productData)
    product.storeId = storeId

    await productRepo.save(product)

    // Handle additional barcodes
    if (validated.additionalBarcodes && validated.additionalBarcodes.length > 0) {
      const barcodeRepo = dataSource.getRepository(ProductBarcode)
      const barcodesToCreate = validated.additionalBarcodes.map((barcode) =>
        barcodeRepo.create({
          productId: product.id,
          barcode,
          isWeightBased: productData.isWeighedProduct || false,
          isPrimary: false,
          isActive: true,
        })
      )
      await barcodeRepo.save(barcodesToCreate)
    }

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Create product error:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
