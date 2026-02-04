import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { SupplierContact } from '@/lib/db/entities/supplier-contact.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { updateSupplierContactSchema } from '@/lib/validations/supplier-contact.schema'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string; supplierId: string; contactId: string }> }
) {
  try {
    const { storeId, supplierId, contactId } = await params

    if (!storeId || !supplierId || !contactId) {
      return NextResponse.json({ error: 'Store ID, Supplier ID, and Contact ID required' }, { status: 400 })
    }

    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const body = await request.json()
    const validated = updateSupplierContactSchema.parse(body)

    const dataSource = await getDataSource()
    const contactRepo = dataSource.getRepository(SupplierContact)

    const contact = await contactRepo.findOne({
      where: { id: contactId, supplierId, storeId },
    })

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    // If this contact is being set as primary, unset other primary contacts
    if (validated.isPrimary && !contact.isPrimary) {
      await contactRepo.update(
        { supplierId, storeId, isPrimary: true },
        { isPrimary: false }
      )
    }

    // Update contact
    Object.assign(contact, validated)
    await contactRepo.save(contact)

    return NextResponse.json(contact)
  } catch (error: any) {
    console.error('Update contact error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ storeId: string; supplierId: string; contactId: string }> }
) {
  try {
    const { storeId, supplierId, contactId } = await params

    if (!storeId || !supplierId || !contactId) {
      return NextResponse.json({ error: 'Store ID, Supplier ID, and Contact ID required' }, { status: 400 })
    }

    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const dataSource = await getDataSource()
    const contactRepo = dataSource.getRepository(SupplierContact)

    const contact = await contactRepo.findOne({
      where: { id: contactId, supplierId, storeId },
    })

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    await contactRepo.remove(contact)

    return NextResponse.json({ success: true, message: 'Contact deleted successfully' })
  } catch (error) {
    console.error('Delete contact error:', error)
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    )
  }
}
