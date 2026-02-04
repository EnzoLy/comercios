import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Store } from '@/lib/db/entities/store.entity'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    await requireSuperAdmin()

    const { storeId } = await params

    const dataSource = await getDataSource()
    const storeRepo = dataSource.getRepository(Store)

    const store = await storeRepo.findOne({ where: { id: storeId } })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    store.isActive = !store.isActive
    await storeRepo.save(store)

    return NextResponse.json({
      id: store.id,
      name: store.name,
      isActive: store.isActive,
    })
  } catch (error) {
    console.error('Toggle store status error:', error)
    return NextResponse.json(
      { error: 'Failed to toggle store status' },
      { status: 500 }
    )
  }
}
