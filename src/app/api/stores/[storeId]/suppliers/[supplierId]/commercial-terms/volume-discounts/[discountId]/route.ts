import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { SupplierVolumeDiscount } from '@/lib/db/entities/supplier-volume-discount.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { updateVolumeDiscountSchema } from '@/lib/validations/supplier-commercial-terms.schema'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string; supplierId: string; discountId: string }> }
) {
  try {
    const { storeId, supplierId, discountId } = await params

    if (!storeId || !supplierId || !discountId) {
      return NextResponse.json(
        { error: 'Store ID, Supplier ID, and Discount ID required' },
        { status: 400 }
      )
    }

    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const body = await request.json()
    const validated = updateVolumeDiscountSchema.parse(body)

    const dataSource = await getDataSource()
    const discountRepo = dataSource.getRepository(SupplierVolumeDiscount)

    const volumeDiscount = await discountRepo.findOne({
      where: { id: discountId, storeId },
      relations: ['commercialTerms'],
    })

    if (!volumeDiscount) {
      return NextResponse.json(
        { error: 'Volume discount not found' },
        { status: 404 }
      )
    }

    // Verify the discount belongs to the correct supplier
    if (volumeDiscount.commercialTerms && volumeDiscount.commercialTerms.supplierId !== supplierId) {
      return NextResponse.json(
        { error: 'Volume discount does not belong to this supplier' },
        { status: 403 }
      )
    }

    // Update volume discount
    Object.assign(volumeDiscount, validated)
    await discountRepo.save(volumeDiscount)

    return NextResponse.json(volumeDiscount)
  } catch (error: any) {
    console.error('Update volume discount error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update volume discount' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ storeId: string; supplierId: string; discountId: string }> }
) {
  try {
    const { storeId, supplierId, discountId } = await params

    if (!storeId || !supplierId || !discountId) {
      return NextResponse.json(
        { error: 'Store ID, Supplier ID, and Discount ID required' },
        { status: 400 }
      )
    }

    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const dataSource = await getDataSource()
    const discountRepo = dataSource.getRepository(SupplierVolumeDiscount)

    const volumeDiscount = await discountRepo.findOne({
      where: { id: discountId, storeId },
      relations: ['commercialTerms'],
    })

    if (!volumeDiscount) {
      return NextResponse.json(
        { error: 'Volume discount not found' },
        { status: 404 }
      )
    }

    // Verify the discount belongs to the correct supplier
    if (volumeDiscount.commercialTerms && volumeDiscount.commercialTerms.supplierId !== supplierId) {
      return NextResponse.json(
        { error: 'Volume discount does not belong to this supplier' },
        { status: 403 }
      )
    }

    await discountRepo.remove(volumeDiscount)

    return NextResponse.json({ success: true, message: 'Volume discount deleted successfully' })
  } catch (error) {
    console.error('Delete volume discount error:', error)
    return NextResponse.json(
      { error: 'Failed to delete volume discount' },
      { status: 500 }
    )
  }
}
