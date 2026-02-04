import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { SupplierVolumeDiscount } from '@/lib/db/entities/supplier-volume-discount.entity'
import { SupplierCommercialTerms } from '@/lib/db/entities/supplier-commercial-terms.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { createVolumeDiscountSchema } from '@/lib/validations/supplier-commercial-terms.schema'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string; supplierId: string }> }
) {
  try {
    const { storeId, supplierId } = await params

    if (!storeId || !supplierId) {
      return NextResponse.json({ error: 'Store ID and Supplier ID required' }, { status: 400 })
    }

    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const termsRepo = dataSource.getRepository(SupplierCommercialTerms)
    const discountRepo = dataSource.getRepository(SupplierVolumeDiscount)

    // Get commercial terms to ensure they exist
    const commercialTerms = await termsRepo.findOne({
      where: { supplierId, storeId },
    })

    if (!commercialTerms) {
      return NextResponse.json(
        { error: 'Commercial terms not found for this supplier' },
        { status: 404 }
      )
    }

    const volumeDiscounts = await discountRepo.find({
      where: { commercialTermsId: commercialTerms.id, storeId },
      order: { minimumQuantity: 'ASC', minimumAmount: 'ASC', createdAt: 'ASC' },
    })

    return NextResponse.json(volumeDiscounts)
  } catch (error) {
    console.error('Get volume discounts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch volume discounts' },
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
      return NextResponse.json({ error: 'Store ID and Supplier ID required' }, { status: 400 })
    }

    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const body = await request.json()
    const validated = createVolumeDiscountSchema.parse(body)

    const dataSource = await getDataSource()
    const termsRepo = dataSource.getRepository(SupplierCommercialTerms)
    const discountRepo = dataSource.getRepository(SupplierVolumeDiscount)

    // Verify commercial terms exist
    const commercialTerms = await termsRepo.findOne({
      where: { supplierId, storeId },
    })

    if (!commercialTerms) {
      return NextResponse.json(
        { error: 'Commercial terms not found. Please create commercial terms first.' },
        { status: 404 }
      )
    }

    // Create volume discount
    const volumeDiscount = discountRepo.create({
      ...validated,
      commercialTermsId: commercialTerms.id,
      storeId,
    })

    await discountRepo.save(volumeDiscount)

    return NextResponse.json(volumeDiscount, { status: 201 })
  } catch (error: any) {
    console.error('Create volume discount error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create volume discount' },
      { status: 500 }
    )
  }
}
