import { NextResponse } from 'next/server'
import { getDataSource } from '@/lib/db'
import { DigitalInvoice } from '@/lib/db/entities/digital-invoice.entity'
import { Sale } from '@/lib/db/entities/sale.entity'
import { requireStoreAccess } from '@/lib/auth/permissions'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string; saleId: string }> }
) {
  try {
    const { storeId, saleId } = await params

    if (!storeId || !saleId) {
      return NextResponse.json(
        { error: 'Store ID and Sale ID required' },
        { status: 400 }
      )
    }

    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const invoiceRepo = dataSource.getRepository(DigitalInvoice)
    const saleRepo = dataSource.getRepository(Sale)

    // Verify sale exists and belongs to this store
    const sale = await saleRepo.findOne({
      where: { id: saleId, storeId },
    })

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
    }

    // Check if invoice already exists
    const existingInvoice = await invoiceRepo.findOne({
      where: { saleId },
    })

    if (existingInvoice) {
      // Return existing invoice with URL
      const invoiceUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invoice/${existingInvoice.accessToken}`
      return NextResponse.json({
        ...existingInvoice,
        invoiceUrl,
      })
    }

    // Create new invoice
    const invoice = invoiceRepo.create({
      saleId,
      storeId,
      invoiceNumber: `INV-${sale.id.substring(0, 8).toUpperCase()}`,
    })

    await invoiceRepo.save(invoice)

    // Generate public URL
    const invoiceUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invoice/${invoice.accessToken}`

    return NextResponse.json(
      {
        ...invoice,
        invoiceUrl,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create invoice error:', error)
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string; saleId: string }> }
) {
  try {
    const { storeId, saleId } = await params

    if (!storeId || !saleId) {
      return NextResponse.json(
        { error: 'Store ID and Sale ID required' },
        { status: 400 }
      )
    }

    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const invoiceRepo = dataSource.getRepository(DigitalInvoice)

    // Find invoice for this sale
    const invoice = await invoiceRepo.findOne({
      where: { saleId, storeId },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Generate public URL
    const invoiceUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invoice/${invoice.accessToken}`

    return NextResponse.json({
      ...invoice,
      invoiceUrl,
    })
  } catch (error) {
    console.error('Get invoice error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    )
  }
}
