import { NextResponse } from 'next/server'
import { requireStoreAccess, isStoreOwner } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Store } from '@/lib/db/entities/store.entity'
import { updateStoreSchema } from '@/lib/validations/store.schema'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params
    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const storeRepo = dataSource.getRepository(Store)
    const store = await storeRepo.findOne({ where: { id: storeId } })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    return NextResponse.json(store)
  } catch (error) {
    console.error('Get store error:', error)
    return NextResponse.json({ error: 'Failed to fetch store' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params
    await requireStoreAccess(storeId)

    // Only owner can update store
    const owner = await isStoreOwner(storeId)
    if (!owner) {
      return NextResponse.json(
        { error: 'Only store owner can update store' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = updateStoreSchema.parse(body)

    const dataSource = await getDataSource()
    const storeRepo = dataSource.getRepository(Store)

    await storeRepo.update({ id: storeId }, validated)

    const updated = await storeRepo.findOne({ where: { id: storeId } })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update store error:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to update store' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params
    await requireStoreAccess(storeId)

    // Only owner can delete store
    const owner = await isStoreOwner(storeId)
    if (!owner) {
      return NextResponse.json(
        { error: 'Only store owner can delete store' },
        { status: 403 }
      )
    }

    const dataSource = await getDataSource()
    const storeRepo = dataSource.getRepository(Store)

    await storeRepo.delete({ id: storeId })

    return NextResponse.json({ message: 'Store deleted successfully' })
  } catch (error) {
    console.error('Delete store error:', error)
    return NextResponse.json({ error: 'Failed to delete store' }, { status: 500 })
  }
}
