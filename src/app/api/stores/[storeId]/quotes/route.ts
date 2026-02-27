import { NextResponse } from 'next/server'
import {
  requireStoreAccess,
  requireRole,
  getStoreIdFromHeaders,
} from '@/lib/auth/permissions'
import { getDataSource, getRepository } from '@/lib/db'
import { Quote, QuoteStatus } from '@/lib/db/entities/quote.entity'
import { QuoteItem, QuoteItemType } from '@/lib/db/entities/quote-item.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { Service } from '@/lib/db/entities/service.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { createQuoteSchema } from '@/lib/validations/quote.schema'

function generateQuoteNumber(): string {
  return `PRES-${Date.now().toString(36).toUpperCase()}`
}

function generateAccessToken(): string {
  return require('crypto').randomBytes(32).toString('hex')
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId: paramStoreId } = await params
    const headerStoreId = getStoreIdFromHeaders(request)
    const storeId = headerStoreId || paramStoreId

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    await requireStoreAccess(storeId)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

    const dataSource = await getDataSource()
    const quoteRepo = dataSource.getRepository(Quote)

    let query = quoteRepo
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.items', 'items')
      .where('quote.storeId = :storeId', { storeId })

    if (status) {
      query = query.andWhere('quote.status = :status', { status })
    }

    if (search) {
      query = query.andWhere(
        '(quote.quoteNumber ILIKE :search OR quote.clientName ILIKE :search OR quote.clientEmail ILIKE :search)',
        { search: `%${search}%` }
      )
    }

    // Get total count
    const totalQuery = query.clone()
    const totalCount = await totalQuery.getCount()

    // Apply pagination
    const quotes = await query
      .orderBy('quote.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany()

    const hasMore = page * pageSize < totalCount

    return NextResponse.json({
      quotes,
      total: totalCount,
      page,
      pageSize,
      hasMore,
    })
  } catch (error) {
    console.error('Get quotes error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId: paramStoreId } = await params
    const headerStoreId = getStoreIdFromHeaders(request)
    const storeId = headerStoreId || paramStoreId

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const body = await request.json()
    const validated = createQuoteSchema.parse(body)

    const dataSource = await getDataSource()

    const quote = await dataSource.transaction(async (manager) => {
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

      // Create quote
      const quoteInsertResult = await manager.insert(Quote, {
        storeId,
        quoteNumber: generateQuoteNumber(),
        accessToken: generateAccessToken(),
        clientName: validated.clientName,
        clientPhone: validated.clientPhone || null,
        clientEmail: null,
        status: QuoteStatus.DRAFT,
        notes: validated.notes || null,
        expiresAt: null,
        subtotal,
        tax: totalTax,
        discount,
        total,
        viewCount: 0,
        lastViewedAt: null,
      })

      const quoteId = quoteInsertResult.identifiers[0].id as string

      // Create quote items
      for (const item of calculatedItems) {
        await manager.insert(QuoteItem, {
          quoteId,
          itemType: item.itemType,
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

      // Return created quote with items
      const savedQuote = await manager.findOne(Quote, {
        where: { id: quoteId },
        relations: ['items'],
      })

      return savedQuote
    })

    return NextResponse.json(quote, { status: 201 })
  } catch (error) {
    console.error('Create quote error:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: (error as any).errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Failed to create quote' },
      { status: 500 }
    )
  }
}
