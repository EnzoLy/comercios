import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Product } from '@/lib/db/entities/product.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { bulkPriceAdjustmentSchema } from '@/lib/validations/product.schema'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const body = await request.json()
    const validated = bulkPriceAdjustmentSchema.parse(body)

    const dataSource = await getDataSource()
    const productRepo = dataSource.getRepository(Product)

    // Verify all products exist and belong to the store
    const products = await productRepo.find({
      where: {
        id: validated.productIds as any,
        storeId,
      } as any,
    })

    if (products.length !== validated.productIds.length) {
      return NextResponse.json(
        { error: 'Algunos productos no existen o no pertenecen a esta tienda' },
        { status: 400 }
      )
    }

    // Calculate new prices
    const updateData = products.map((product) => {
      let newSellingPrice = product.sellingPrice
      let newCostPrice = product.costPrice

      const { adjustmentType, adjustmentValue, targetField } = validated

      // Calculate selling price
      if (targetField === 'sellingPrice' || targetField === 'both') {
        switch (adjustmentType) {
          case 'percentage':
            newSellingPrice = product.sellingPrice * (1 + adjustmentValue / 100)
            break
          case 'fixed':
            newSellingPrice = product.sellingPrice + adjustmentValue
            break
          case 'replace':
            newSellingPrice = adjustmentValue
            break
        }
      }

      // Calculate cost price
      if (targetField === 'costPrice' || targetField === 'both') {
        switch (adjustmentType) {
          case 'percentage':
            newCostPrice = product.costPrice * (1 + adjustmentValue / 100)
            break
          case 'fixed':
            newCostPrice = product.costPrice + adjustmentValue
            break
          case 'replace':
            newCostPrice = adjustmentValue
            break
        }
      }

      // Validate prices are not negative
      if (newSellingPrice < 0 || newCostPrice < 0) {
        throw new Error('Los precios resultantes no pueden ser negativos')
      }

      return {
        id: product.id,
        sellingPrice: Math.round(newSellingPrice * 100) / 100, // Round to 2 decimals
        costPrice: Math.round(newCostPrice * 100) / 100,
      }
    })

    // Update all products in a transaction
    await dataSource.transaction(async (transactionalEntityManager) => {
      for (const data of updateData) {
        await transactionalEntityManager.update(Product, data.id, {
          sellingPrice: data.sellingPrice,
          costPrice: data.costPrice,
        })
      }
    })

    return NextResponse.json({
      updated: updateData.length,
      failed: 0,
    })
  } catch (error) {
    console.error('Bulk price adjustment error:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('no pueden ser negativos')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al ajustar precios' },
      { status: 500 }
    )
  }
}
