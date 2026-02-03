import { NextResponse } from 'next/server'
import { requireStoreAccess } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Product } from '@/lib/db/entities/product.entity'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string; barcode: string }> }
) {
  try {
    const { storeId, barcode } = await params
    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const productRepo = dataSource.getRepository(Product)

    const product = await productRepo.findOne({
      where: { storeId, barcode, isActive: true },
      relations: ['category', 'supplier'],
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Barcode lookup error:', error)
    return NextResponse.json(
      { error: 'Failed to lookup product' },
      { status: 500 }
    )
  }
}
