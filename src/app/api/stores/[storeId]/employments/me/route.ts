import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { requireStoreAccess } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Employment } from '@/lib/db/entities/employment.entity'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify store access
    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const employmentRepo = dataSource.getRepository(Employment)

    // Get current user's employment in this store
    const employment = await employmentRepo.findOne({
      where: { storeId, userId: session.user.id },
      relations: ['user', 'store'],
    })

    if (!employment) {
      return NextResponse.json(
        { error: 'Employment not found in this store' },
        { status: 404 }
      )
    }

    // Hide password from response
    const sanitized = {
      ...employment,
      user: employment.user ? {
        id: employment.user.id,
        name: employment.user.name,
        email: employment.user.email,
        role: employment.user.role,
      } : null,
    }

    return NextResponse.json(sanitized)
  } catch (error) {
    console.error('Get my employment error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employment' },
      { status: 500 }
    )
  }
}
