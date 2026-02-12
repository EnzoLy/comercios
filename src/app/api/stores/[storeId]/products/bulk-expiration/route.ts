import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Product } from '@/lib/db/entities/product.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { bulkExpirationToggleSchema } from '@/lib/validations/product.schema'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    await requireRole(storeId, [EmploymentRole.ADMIN])

    const body = await request.json()
    const validated = bulkExpirationToggleSchema.parse(body)

    const dataSource = await getDataSource()

    const result = await dataSource.transaction(async (manager) => {
      // 1. Verificar que todos los productos existen y pertenecen al store
      const products = await manager.find(Product, {
        where: validated.productIds.map((id) => ({
          id,
          storeId,
        })),
      })

      if (products.length !== validated.productIds.length) {
        throw new Error('Uno o más productos no fueron encontrados')
      }

      // 2. Verificar productos con stock si se está habilitando tracking
      const productsWithStock: Product[] = []
      if (validated.trackExpirationDates) {
        for (const product of products) {
          if (product.currentStock > 0) {
            productsWithStock.push(product)
          }
        }
      }

      // 3. Actualizar trackExpirationDates en todos los productos
      await manager.update(
        Product,
        { id: validated.productIds as any },
        { trackExpirationDates: validated.trackExpirationDates }
      )

      return {
        updatedCount: products.length,
        productsWithStock: productsWithStock.map((p) => ({
          id: p.id,
          name: p.name,
          currentStock: p.currentStock,
        })),
      }
    })

    // 4. Si hay productos con stock, advertir al usuario
    if (result.productsWithStock.length > 0) {
      return NextResponse.json(
        {
          success: true,
          updatedCount: result.updatedCount,
          warning: 'Algunos productos tienen stock actual y requieren ajuste manual de lotes',
          productsWithStock: result.productsWithStock,
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        updatedCount: result.updatedCount,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Bulk expiration toggle error:', error)

    if (error instanceof Error) {
      if (error.message.includes('no fueron encontrados')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update products' },
      { status: 500 }
    )
  }
}
