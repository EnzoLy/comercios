import { NextResponse } from 'next/server'
import { requireStoreAccess } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Sale } from '@/lib/db/entities/sale.entity'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string; saleId: string }> }
) {
  try {
    const { storeId, saleId } = await params
    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const saleRepo = dataSource.getRepository(Sale)

    const sale = await saleRepo.findOne({
      where: { id: saleId, storeId },
      relations: ['items', 'items.product', 'cashier', 'stockMovements'],
    })

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
    }

    return NextResponse.json(sale)
  } catch (error) {
    console.error('Get sale error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sale' },
      { status: 500 }
    )
  }
}
