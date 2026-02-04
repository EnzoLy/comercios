import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole, getUserIdFromHeaders } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { SupplierDocument } from '@/lib/db/entities/supplier-document.entity'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { createSupplierDocumentSchema, documentQuerySchema } from '@/lib/validations/supplier-document.schema'

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

    const { searchParams } = new URL(request.url)
    const queryParams = {
      documentType: searchParams.get('documentType') || undefined,
      isActive: searchParams.get('isActive') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    }

    const validated = documentQuerySchema.parse(queryParams)

    const dataSource = await getDataSource()
    const documentRepo = dataSource.getRepository(SupplierDocument)

    // Build where clause
    const where: any = { supplierId, storeId }

    if (validated.documentType) {
      where.documentType = validated.documentType
    }

    if (validated.isActive === 'true') {
      where.isActive = true
    } else if (validated.isActive === 'false') {
      where.isActive = false
    }
    // If 'all', don't filter by isActive

    const skip = (validated.page - 1) * validated.limit

    const [documents, total] = await documentRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: validated.limit,
    })

    return NextResponse.json({
      data: documents,
      pagination: {
        page: validated.page,
        limit: validated.limit,
        total,
        totalPages: Math.ceil(total / validated.limit),
      },
    })
  } catch (error: any) {
    console.error('Get documents error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch documents' },
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

    let userId = getUserIdFromHeaders(request)

    // Fallback: if userId is missing from headers, try to get it from session
    if (!userId) {
      const { auth } = await import('@/lib/auth/auth')
      const session = await auth()
      userId = session?.user?.id || null
    }

    const body = await request.json()
    const validated = createSupplierDocumentSchema.parse(body)

    const dataSource = await getDataSource()
    const supplierRepo = dataSource.getRepository(Supplier)
    const documentRepo = dataSource.getRepository(SupplierDocument)

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

    // Create document
    const document = documentRepo.create({
      ...validated,
      supplierId,
      storeId,
      uploadedBy: userId || undefined,
    })

    await documentRepo.save(document)

    return NextResponse.json(document, { status: 201 })
  } catch (error: any) {
    console.error('Create document error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    )
  }
}
