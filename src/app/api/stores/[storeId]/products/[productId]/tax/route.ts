import { NextResponse } from 'next/server'
import { requireStoreAccess } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Product } from '@/lib/db/entities/product.entity'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string; productId: string }> }
) {
  try {
    const { storeId, productId } = await params
    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const product = await dataSource.getRepository(Product).findOne({
      where: { id: productId, storeId },
    })

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      taxRate: product.taxRate || null,
      overrideTaxRate: product.overrideTaxRate,
    })
  } catch (error) {
    console.error('Error fetching product tax settings:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string; productId: string }> }
) {
  try {
    const { storeId, productId } = await params
    await requireStoreAccess(storeId)

    const { taxRate, overrideTaxRate } = await request.json()

    // Validar datos
    if (taxRate !== null && taxRate !== undefined && (taxRate < 0 || taxRate > 100)) {
      return NextResponse.json(
        { error: 'La tasa de impuesto debe estar entre 0 y 100' },
        { status: 400 }
      )
    }

    const dataSource = await getDataSource()
    const productRepo = dataSource.getRepository(Product)

    const product = await productRepo.findOne({
      where: { id: productId, storeId },
    })

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    // Actualizar configuración de impuestos
    product.taxRate = taxRate
    product.overrideTaxRate = overrideTaxRate ?? product.overrideTaxRate

    await productRepo.save(product)

    return NextResponse.json({
      message: 'Impuestos del producto actualizados correctamente',
      taxRate: product.taxRate,
      overrideTaxRate: product.overrideTaxRate,
    })
  } catch (error) {
    console.error('Error updating product tax:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
