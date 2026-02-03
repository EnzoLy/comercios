import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { getDataSource } from '@/lib/db'
import { User } from '@/lib/db/entities/user.entity'
import { Employment } from '@/lib/db/entities/employment.entity'

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId, storeId } = await request.json()

    if (!employeeId || !storeId) {
      return NextResponse.json(
        { error: 'employeeId and storeId required' },
        { status: 400 }
      )
    }

    const dataSource = await getDataSource()

    // Verify current user has access to this store
    const currentUserEmployments = await dataSource
      .getRepository(Employment)
      .find({
        where: { userId: session.user.id, storeId },
      })

    if (!currentUserEmployments || currentUserEmployments.length === 0) {
      return NextResponse.json(
        { error: 'No access to this store' },
        { status: 403 }
      )
    }

    // Verify target user exists and has access to this store
    const targetUser = await dataSource.getRepository(User).findOne({
      where: { id: employeeId, isActive: true },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 404 }
      )
    }

    const targetUserEmployment = await dataSource
      .getRepository(Employment)
      .findOne({
        where: { userId: employeeId, storeId, isActive: true },
      })

    if (!targetUserEmployment) {
      return NextResponse.json(
        { error: 'User has no access to this store' },
        { status: 403 }
      )
    }

    // Return the target user's info so frontend can update context
    return NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
      },
    })
  } catch (error) {
    console.error('Error switching user:', error)
    return NextResponse.json(
      { error: 'Failed to switch user' },
      { status: 500 }
    )
  }
}
