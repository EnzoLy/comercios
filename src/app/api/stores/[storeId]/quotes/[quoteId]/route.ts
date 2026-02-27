import { NextResponse } from 'next/server'
import {
  requireStoreAccess,
  requireRole,
  getStoreIdFromHeaders,
} from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Quote, QuoteStatus } from '@/lib/db/entities/quote.entity'
import { QuoteItem, QuoteItemType } from '@/lib/db/entities/quote-item.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { Service } from '@/lib/db/entities/service.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { updateQuoteSchema } from '@/lib/validations/quote.schema'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string; quoteId: string }> }
) {
  try {
    const { storeId: paramStoreId, quoteId } = await params
    const headerStoreId = getStoreIdFromHeaders(request)
    const storeId = headerStoreId || paramStoreId

    if (!storeId || !quoteId) {
      return NextResponse.json(
        { error: 'Store ID and Quote ID required' },
        { status: 400 }
      )
    }

    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const quoteRepo = dataSource.getRepository(Quote)

    const quote = await quoteRepo.findOne({
      where: { id: quoteId, storeId },
      relations: ['items'],
    })

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    return NextResponse.json(quote)
  } catch (error) {
    console.error('Get quote error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quote' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string; quoteId: string }> }
) {
  try {
    const { storeId: paramStoreId, quoteId } = await params
    const headerStoreId = getStoreIdFromHeaders(request)
    const storeId = headerStoreId || paramStoreId

    if (!storeId || !quoteId) {
      return NextResponse.json(
        { error: 'Store ID and Quote ID required' },
        { status: 400 }
      )
    }

    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const body = await request.json()
    const validated = updateQuoteSchema.parse(body)

    const dataSource = await getDataSource()

    const updatedQuote = await dataSource.transaction(async (manager) => {
      const quoteRepo = manager.getRepository(Quote)
      const quote = await quoteRepo.findOne({
        where: { id: quoteId, storeId },
        relations: ['items'],
      })

      if (!quote) {
        throw new Error('Quote not found')
      }

      // If items are provided, recalculate them
      if (validated.items && validated.items.length > 0) {
        // Validate all items exist
        for (const item of validated.items) {
          if (item.itemType === 'product' && item.productId) {
            const product = await manager.findOne(Product, {
              where: { id: item.productId, storeId },
            })
            if (!product) {
              throw new Error(`Product ${item.productId} not found`)
            }
          } else if (item.itemType === 'service' && item.serviceId) {
            const service = await manager.findOne(Service, {
              where: { id: item.serviceId, storeId },
            })
            if (!service) {
              throw new Error(`Service ${item.serviceId} not found`)
            }
          }
        }

        // Calculate totals
        let subtotal = 0
        let totalTax = 0

        const calculatedItems = validated.items.map((item) => {
          const itemSubtotal = item.quantity * item.unitPrice
          const itemDiscount = item.discount || 0
          const itemTaxRate = item.taxRate || 0
          const itemTaxAmount = (itemSubtotal - itemDiscount) * (itemTaxRate / 100)
          const itemTotal = itemSubtotal - itemDiscount + itemTaxAmount

          subtotal += itemSubtotal
          totalTax += itemTaxAmount

          return {
            ...item,
            subtotal: itemSubtotal,
            taxAmount: itemTaxAmount,
            total: itemTotal,
          }
        })

        const discount = 0
        const total = subtotal + totalTax - discount

        // Delete old items
        await manager.delete(QuoteItem, { quoteId })

        // Create new items
        for (const item of calculatedItems) {
          const itemTypeEnum = item.itemType as QuoteItemType
          await manager.insert(QuoteItem, {
            quoteId,
            itemType: itemTypeEnum,
            productId: item.productId || null,
            serviceId: item.serviceId || null,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            discount: item.discount || 0,
            total: item.total,
            taxRate: item.taxRate || 0,
            taxAmount: item.taxAmount,
          })
        }

        quote.subtotal = subtotal
        quote.tax = totalTax
        quote.discount = discount
        quote.total = total
      }

      // Update other fields
      if (validated.clientName) quote.clientName = validated.clientName
      if (validated.clientPhone !== undefined) quote.clientPhone = validated.clientPhone
      if (validated.notes !== undefined) quote.notes = validated.notes
      if (validated.status) quote.status = validated.status as QuoteStatus

      await quoteRepo.save(quote)

      // Reload with items
      const saved = await quoteRepo.findOne({
        where: { id: quoteId },
        relations: ['items'],
      })

      return saved
    })

    return NextResponse.json(updatedQuote)
  } catch (error) {
    console.error('Update quote error:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: (error as any).errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      if (error.message === 'Quote not found') {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Failed to update quote' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ storeId: string; quoteId: string }> }
) {
  try {
    const { storeId: paramStoreId, quoteId } = await params
    const headerStoreId = getStoreIdFromHeaders(request)
    const storeId = headerStoreId || paramStoreId

    if (!storeId || !quoteId) {
      return NextResponse.json(
        { error: 'Store ID and Quote ID required' },
        { status: 400 }
      )
    }

    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const dataSource = await getDataSource()
    const quoteRepo = dataSource.getRepository(Quote)

    const quote = await quoteRepo.findOne({
      where: { id: quoteId, storeId },
    })

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    await quoteRepo.remove(quote)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete quote error:', error)
    return NextResponse.json(
      { error: 'Failed to delete quote' },
      { status: 500 }
    )
  }
}
