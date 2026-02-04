import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { SupplierContact } from '@/lib/db/entities/supplier-contact.entity'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { createSupplierContactWithValidationSchema } from '@/lib/validations/supplier-contact.schema'

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
    const contactRepo = dataSource.getRepository(SupplierContact)

    const contacts = await contactRepo.find({
      where: { supplierId, storeId },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    })

    return NextResponse.json(contacts)
  } catch (error) {
    console.error('Get contacts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
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
    const validated = createSupplierContactWithValidationSchema.parse(body)

    const dataSource = await getDataSource()
    const supplierRepo = dataSource.getRepository(Supplier)
    const contactRepo = dataSource.getRepository(SupplierContact)

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

    // If this contact is being set as primary, unset other primary contacts
    if (validated.isPrimary) {
      await contactRepo.update(
        { supplierId, storeId, isPrimary: true },
        { isPrimary: false }
      )
    }

    // Create contact
    const contact = contactRepo.create({
      ...validated,
      supplierId,
      storeId,
    })

    await contactRepo.save(contact)

    return NextResponse.json(contact, { status: 201 })
  } catch (error: any) {
    console.error('Create contact error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    )
  }
}
