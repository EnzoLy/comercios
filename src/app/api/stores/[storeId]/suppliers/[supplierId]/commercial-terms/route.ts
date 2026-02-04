import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { SupplierCommercialTerms } from '@/lib/db/entities/supplier-commercial-terms.entity'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { createSupplierCommercialTermsSchema } from '@/lib/validations/supplier-commercial-terms.schema'

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

    const commercialTerms = await termsRepo.findOne({
      where: { supplierId, storeId },
      relations: ['volumeDiscounts'],
    })

    if (!commercialTerms) {
      return NextResponse.json(
        { error: 'Commercial terms not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(commercialTerms)
  } catch (error) {
    console.error('Get commercial terms error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch commercial terms' },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const validated = createSupplierCommercialTermsSchema.parse(body)

    const dataSource = await getDataSource()
    const supplierRepo = dataSource.getRepository(Supplier)
    const termsRepo = dataSource.getRepository(SupplierCommercialTerms)

    // Verify supplier exists
    const supplier = await supplierRepo.findOne({
      where: { id: supplierId, storeId },
    })

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    // Check if commercial terms already exist
    let commercialTerms = await termsRepo.findOne({
      where: { supplierId, storeId },
    })

    if (commercialTerms) {
      // Update existing commercial terms
      Object.assign(commercialTerms, validated)
      await termsRepo.save(commercialTerms)
    } else {
      // Create new commercial terms
      commercialTerms = termsRepo.create({
        ...validated,
        supplierId,
        storeId,
      })
      await termsRepo.save(commercialTerms)
    }

    return NextResponse.json(commercialTerms, { status: commercialTerms ? 200 : 201 })
  } catch (error: any) {
    console.error('Create/Update commercial terms error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create or update commercial terms' },
      { status: 500 }
    )
  }
}
