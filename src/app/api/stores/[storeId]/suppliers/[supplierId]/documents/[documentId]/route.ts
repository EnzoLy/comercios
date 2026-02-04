import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { SupplierDocument } from '@/lib/db/entities/supplier-document.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { updateSupplierDocumentSchema } from '@/lib/validations/supplier-document.schema'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string; supplierId: string; documentId: string }> }
) {
  try {
    const { storeId, supplierId, documentId } = await params

    if (!storeId || !supplierId || !documentId) {
      return NextResponse.json({ error: 'Store ID, Supplier ID, and Document ID required' }, { status: 400 })
    }

    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const documentRepo = dataSource.getRepository(SupplierDocument)

    const document = await documentRepo.findOne({
      where: { id: documentId, supplierId, storeId },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error('Get document error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string; supplierId: string; documentId: string }> }
) {
  try {
    const { storeId, supplierId, documentId } = await params

    if (!storeId || !supplierId || !documentId) {
      return NextResponse.json({ error: 'Store ID, Supplier ID, and Document ID required' }, { status: 400 })
    }

    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const body = await request.json()
    const validated = updateSupplierDocumentSchema.parse(body)

    const dataSource = await getDataSource()
    const documentRepo = dataSource.getRepository(SupplierDocument)

    const document = await documentRepo.findOne({
      where: { id: documentId, supplierId, storeId },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Update document metadata (not the file itself)
    Object.assign(document, validated)
    await documentRepo.save(document)

    return NextResponse.json(document)
  } catch (error: any) {
    console.error('Update document error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ storeId: string; supplierId: string; documentId: string }> }
) {
  try {
    const { storeId, supplierId, documentId } = await params

    if (!storeId || !supplierId || !documentId) {
      return NextResponse.json({ error: 'Store ID, Supplier ID, and Document ID required' }, { status: 400 })
    }

    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const { searchParams } = new URL(request.url)
    const deleteFile = searchParams.get('deleteFile') === 'true'

    const dataSource = await getDataSource()
    const documentRepo = dataSource.getRepository(SupplierDocument)

    const document = await documentRepo.findOne({
      where: { id: documentId, supplierId, storeId },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Optionally delete file from filesystem
    if (deleteFile && document.fileUrl) {
      try {
        // Extract file path from URL (assuming fileUrl contains local path)
        // This is a simple implementation - adjust based on your file storage strategy
        const urlPath = new URL(document.fileUrl, 'http://localhost').pathname
        const filePath = join(process.cwd(), 'public', urlPath)
        await unlink(filePath)
      } catch (fileError) {
        console.error('Failed to delete file from filesystem:', fileError)
        // Continue with database deletion even if file deletion fails
      }
    }

    await documentRepo.remove(document)

    return NextResponse.json({ success: true, message: 'Document deleted successfully' })
  } catch (error) {
    console.error('Delete document error:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
