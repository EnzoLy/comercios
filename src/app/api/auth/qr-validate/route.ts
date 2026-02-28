import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { getRepository } from '@/lib/db'
import { Employment } from '@/lib/db/entities/employment.entity'
import { User } from '@/lib/db/entities/user.entity'

export async function POST(request: Request) {
  try {
    // Must be authenticated to validate QR login
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { employmentId, storeId } = body

    if (!employmentId || !storeId) {
      return NextResponse.json(
        { error: 'employmentId and storeId are required' },
        { status: 400 }
      )
    }

    // Verify the authenticated user has access to this store
    const employmentRepo = await getRepository(Employment)
    const userEmployment = await employmentRepo.findOne({
      where: {
        userId: session.user.id,
        storeId,
        isActive: true,
      },
    })

    if (!userEmployment) {
      return NextResponse.json(
        { error: 'User does not have access to this store' },
        { status: 403 }
      )
    }

    // Now verify the QR employment exists and is active
    const qrEmployment = await employmentRepo.findOne({
      where: {
        id: employmentId,
        storeId,
        isActive: true,
      },
      relations: ['user'],
    })

    if (!qrEmployment) {
      return NextResponse.json(
        { error: 'Employment not found or inactive' },
        { status: 404 }
      )
    }

    // Verify the employment user exists and is active
    if (!qrEmployment.user || !qrEmployment.user.isActive) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 404 }
      )
    }

    // Return validated QR employment data
    return NextResponse.json({
      userId: qrEmployment.userId,
      userName: qrEmployment.user.name,
      role: qrEmployment.role,
      employmentId: qrEmployment.id,
      storeId: qrEmployment.storeId,
    })
  } catch (error) {
    console.error('QR validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate QR login' },
      { status: 500 }
    )
  }
}
