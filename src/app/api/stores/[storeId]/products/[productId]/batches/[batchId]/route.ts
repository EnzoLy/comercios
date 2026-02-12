import { NextResponse } from 'next/server'
import { requireRole, getUserIdFromHeaders } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { ProductBatch } from '@/lib/db/entities/product-batch.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { updateBatchSchema } from '@/lib/validations/batch.schema'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string; productId: string; batchId: string }> }
) {
  try {
    const { storeId, productId, batchId } = await params

    if (!storeId || !productId || !batchId) {
      return NextResponse.json(
        { error: 'Store ID, Product ID, and Batch ID required' },
        { status: 400 }
      )
    }

    await requireRole(storeId, [
      EmploymentRole.ADMIN,
      EmploymentRole.MANAGER,
      EmploymentRole.STOCK_KEEPER,
    ])

    const dataSource = await getDataSource()

    const batch = await dataSource.getRepository(ProductBatch).findOne({
      where: { id: batchId, productId },
      relations: ['product'],
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    // Verify product belongs to store
    if (batch.product.storeId !== storeId) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    return NextResponse.json(batch, { status: 200 })
  } catch (error: any) {
    console.error('Get batch error:', error)
    return NextResponse.json({ error: 'Failed to fetch batch' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string; productId: string; batchId: string }> }
) {
  try {
    const { storeId, productId, batchId } = await params

    if (!storeId || !productId || !batchId) {
      return NextResponse.json(
        { error: 'Store ID, Product ID, and Batch ID required' },
        { status: 400 }
      )
    }

    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const body = await request.json()
    const validated = updateBatchSchema.parse(body)

    const dataSource = await getDataSource()

    const batch = await dataSource.transaction(async (manager) => {
      // 1. Verificar que el batch existe y pertenece al producto
      const existingBatch = await manager.findOne(ProductBatch, {
        where: { id: batchId, productId },
        relations: ['product'],
      })

      if (!existingBatch) {
        throw new Error('Batch not found')
      }

      // Verify product belongs to store
      if (existingBatch.product.storeId !== storeId) {
        throw new Error('Batch not found')
      }

      // 2. Actualizar campos permitidos
      if (validated.batchNumber !== undefined) {
        existingBatch.batchNumber = validated.batchNumber
      }

      if (validated.expirationDate !== undefined) {
        existingBatch.expirationDate = new Date(validated.expirationDate)
      }

      if (validated.currentQuantity !== undefined) {
        existingBatch.currentQuantity = validated.currentQuantity
      }

      if (validated.unitCost !== undefined) {
        existingBatch.unitCost = validated.unitCost
      }

      await manager.save(existingBatch)

      // 3. Si se modificó currentQuantity, reconciliar stock del producto
      if (validated.currentQuantity !== undefined) {
        const allBatches = await manager.find(ProductBatch, {
          where: { productId },
        })

        const totalStock = allBatches.reduce(
          (sum, b) => sum + b.currentQuantity,
          0
        )

        await manager.update(Product, { id: productId }, { currentStock: totalStock })
      }

      return existingBatch
    })

    return NextResponse.json(batch, { status: 200 })
  } catch (error: any) {
    console.error('Update batch error:', error)

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
    }

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to update batch' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ storeId: string; productId: string; batchId: string }> }
) {
  try {
    const { storeId, productId, batchId } = await params

    if (!storeId || !productId || !batchId) {
      return NextResponse.json(
        { error: 'Store ID, Product ID, and Batch ID required' },
        { status: 400 }
      )
    }

    await requireRole(storeId, [EmploymentRole.ADMIN])

    const dataSource = await getDataSource()

    await dataSource.transaction(async (manager) => {
      // 1. Verificar que el batch existe y pertenece al producto
      const batch = await manager.findOne(ProductBatch, {
        where: { id: batchId, productId },
        relations: ['product'],
      })

      if (!batch) {
        throw new Error('Batch not found')
      }

      // Verify product belongs to store
      if (batch.product.storeId !== storeId) {
        throw new Error('Batch not found')
      }

      // 2. Solo permitir eliminar lotes con cantidad 0
      if (batch.currentQuantity > 0) {
        throw new Error(
          `No se puede eliminar un lote con stock (${batch.currentQuantity} unidades). Ajusta la cantidad a 0 primero.`
        )
      }

      // 3. Eliminar el lote
      await manager.remove(batch)
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('Delete batch error:', error)

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (error.message.includes('No se puede eliminar')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json({ error: 'Failed to delete batch' }, { status: 500 })
  }
}
