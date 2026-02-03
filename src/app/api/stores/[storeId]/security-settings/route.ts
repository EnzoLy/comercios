import { NextResponse } from 'next/server'
import { requireRole, isStoreOwner } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Store } from '@/lib/db/entities/store.entity'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    // Allow any authenticated user to view security settings (needed for POS)
    const { requireStoreAccess } = await import('@/lib/auth/permissions')
    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const storeRepo = dataSource.getRepository(Store)

    const store = await storeRepo.findOne({
      where: { id: storeId },
      select: ['id', 'requireEmployeePin'],
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    return NextResponse.json({
      requireEmployeePin: store.requireEmployeePin ?? true,
    })
  } catch (error) {
    console.error('Get security settings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch security settings' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    // Only store owners can modify security settings
    const owner = await isStoreOwner(storeId)
    if (!owner) {
      return NextResponse.json(
        { error: 'Only store owners can modify security settings' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { requireEmployeePin } = body

    if (typeof requireEmployeePin !== 'boolean') {
      return NextResponse.json(
        { error: 'requireEmployeePin must be a boolean' },
        { status: 400 }
      )
    }

    const dataSource = await getDataSource()
    const storeRepo = dataSource.getRepository(Store)

    await storeRepo.update(
      { id: storeId },
      { requireEmployeePin }
    )

    return NextResponse.json({
      success: true,
      requireEmployeePin,
    })
  } catch (error) {
    console.error('Update security settings error:', error)
    return NextResponse.json(
      { error: 'Failed to update security settings' },
      { status: 500 }
    )
  }
}
