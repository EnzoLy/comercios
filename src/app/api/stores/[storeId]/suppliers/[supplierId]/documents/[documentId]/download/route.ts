import { NextResponse } from 'next/server'
import { requireStoreAccess } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { SupplierDocument } from '@/lib/db/entities/supplier-document.entity'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { lookup } from 'mime-types'

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

    const { searchParams } = new URL(request.url)
    const inline = searchParams.get('inline') === 'true'

    try {
      // Extract file path from URL
      const urlPath = new URL(document.fileUrl, 'http://localhost').pathname
      const filePath = join(process.cwd(), 'public', urlPath)

      // Read file
      const fileBuffer = await readFile(filePath)

      // Determine MIME type
      const mimeType = document.mimeType || lookup(document.fileName) || 'application/octet-stream'

      // Set headers for file download or inline display
      const headers = new Headers()
      headers.set('Content-Type', mimeType)
      headers.set('Content-Length', fileBuffer.length.toString())

      if (inline) {
        headers.set('Content-Disposition', `inline; filename="${document.fileName}"`)
      } else {
        headers.set('Content-Disposition', `attachment; filename="${document.fileName}"`)
      }

      // Cache control for better performance
      headers.set('Cache-Control', 'private, max-age=3600')

      return new NextResponse(fileBuffer, {
        status: 200,
        headers,
      })
    } catch (fileError: any) {
      console.error('File read error:', fileError)

      if (fileError.code === 'ENOENT') {
        return NextResponse.json(
          { error: 'File not found on filesystem' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to read file' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Download document error:', error)
    return NextResponse.json(
      { error: 'Failed to download document' },
      { status: 500 }
    )
  }
}
