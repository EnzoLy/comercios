import { NextResponse } from 'next/server'
import { getRepository } from '@/lib/db'
import { User } from '@/lib/db/entities/user.entity'
import { requireAuth } from '@/lib/auth/permissions'
import { AVAILABLE_THEMES } from '@/lib/themes'

export async function POST(request: Request) {
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

    const body = await request.json()
    const { colorTheme } = body

    if (!colorTheme || typeof colorTheme !== 'string') {
      return NextResponse.json(
        { error: 'Color theme is required' },
        { status: 400 }
      )
    }

    // Validate theme exists
    if (!AVAILABLE_THEMES[colorTheme]) {
      return NextResponse.json(
        { error: 'Invalid color theme' },
        { status: 400 }
      )
    }

    // Update user with new theme
    const userRepo = await getRepository(User)
    await userRepo.update(
      { id: userId },
      { colorTheme }
    )

    return NextResponse.json({
      success: true,
      message: 'Color theme updated successfully',
      colorTheme,
    })
  } catch (error) {
    console.error('Set color theme error:', error)
    return NextResponse.json(
      { error: 'Error updating color theme' },
      { status: 500 }
    )
  }
}
