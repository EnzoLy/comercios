import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { expiringProductsReportSchema } from '@/lib/validations/batch.schema'
import { BatchManagementService } from '@/lib/services/batch-management.service'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    await requireRole(storeId, [
      EmploymentRole.ADMIN,
      EmploymentRole.MANAGER,
      EmploymentRole.STOCK_KEEPER,
    ])

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryData = {
      days: searchParams.get('days'),
      categoryId: searchParams.get('categoryId'),
      onlyExpired: searchParams.get('onlyExpired'),
    }

    const validated = expiringProductsReportSchema.parse(queryData)

    const dataSource = await getDataSource()
    const batchService = new BatchManagementService()

    return dataSource.transaction(async (manager) => {
      let expiringProducts = await batchService.getExpiringBatches(
        storeId,
        validated.days,
        manager
      )

      // Filter by category if provided
      if (validated.categoryId) {
        expiringProducts = expiringProducts.filter(
          (ep) => ep.product.categoryId === validated.categoryId
        )
      }

      // Filter only expired if requested
      if (validated.onlyExpired) {
        const now = new Date()
        expiringProducts = expiringProducts.map((ep) => ({
          ...ep,
          batches: ep.batches.filter((b) => b.daysUntilExpiration < 0),
        })).filter((ep) => ep.batches.length > 0)
      }

      return NextResponse.json(
        {
          products: expiringProducts,
          generatedAt: new Date(),
          filters: {
            days: validated.days,
            categoryId: validated.categoryId,
            onlyExpired: validated.onlyExpired,
          },
        },
        { status: 200 }
      )
    })
  } catch (error: any) {
    console.error('Expiring products report error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
