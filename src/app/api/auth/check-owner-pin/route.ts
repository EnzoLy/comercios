import { NextResponse } from 'next/server'
import { getRepository } from '@/lib/db'
import { User } from '@/lib/db/entities/user.entity'
import { requireAuth } from '@/lib/auth/permissions'

export async function GET() {
  try {
    // Verify authentication
    const session = await requireAuth()
    const userId = session.user.id

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Get user
    const userRepo = await getRepository(User)
    const user = await userRepo.findOne({
      where: { id: userId },
      select: ['id', 'ownerPin']
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Check if user has PIN configured
    const hasPin = !!user.ownerPin

    return NextResponse.json({ hasPin })
  } catch (error) {
    console.error('Check owner PIN error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
