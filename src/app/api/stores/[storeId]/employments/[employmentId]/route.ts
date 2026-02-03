import { NextResponse } from 'next/server'
import { requireStoreAccess } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Employment } from '@/lib/db/entities/employment.entity'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string; employmentId: string }> }
) {
  try {
    const { storeId, employmentId } = await params

    if (!storeId || !employmentId) {
      return NextResponse.json(
        { error: 'Store ID and Employment ID required' },
        { status: 400 }
      )
    }

    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const employmentRepo = dataSource.getRepository(Employment)

    const employment = await employmentRepo.findOne({
      where: { id: employmentId, storeId },
      relations: ['user', 'store'],
    })

    if (!employment) {
      return NextResponse.json({ error: 'Employment not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: employment.id,
      role: employment.role,
      isActive: employment.isActive,
      userId: employment.userId,
      storeId: employment.storeId,
      store: {
        id: employment.store.id,
        name: employment.store.name,
        ownerId: employment.store.ownerId,
      },
      user: {
        id: employment.user.id,
        name: employment.user.name,
        email: employment.user.email,
      },
    })
  } catch (error) {
    console.error('Get employment error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employment' },
      { status: 500 }
    )
  }
}
