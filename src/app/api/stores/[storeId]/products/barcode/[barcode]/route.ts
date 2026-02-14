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

    // 1. Try primary barcode
    let product = await productRepo.findOne({
      where: { storeId, barcode, isActive: true },
      relations: ['category', 'supplier'],
    })

    // 2. Try additional barcodes if not found directly
    if (!product) {
      const { ProductBarcode } = await import('@/lib/db/entities/product-barcode.entity')
      const barcodeRepo = dataSource.getRepository(ProductBarcode)

      const barcodeEntity = await barcodeRepo
        .createQueryBuilder('pb')
        .innerJoinAndSelect('pb.product', 'product')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('product.supplier', 'supplier')
        .where('pb.barcode = :barcode', { barcode })
        .andWhere('product.storeId = :storeId', { storeId })
        .andWhere('product.isActive = :isActive', { isActive: true })
        .andWhere('pb.isActive = :pbActive', { pbActive: true })
        .getOne()

      if (barcodeEntity) {
        product = barcodeEntity.product
      }
    }

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado o inactivo' },
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
