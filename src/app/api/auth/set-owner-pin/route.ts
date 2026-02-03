import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getRepository } from '@/lib/db'
import { User } from '@/lib/db/entities/user.entity'
import { requireAuth } from '@/lib/auth/permissions'

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
    const { pin } = body

    if (!pin || typeof pin !== 'string' || pin.length !== 4 || !/^\d+$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN debe ser exactamente 4 dígitos' },
        { status: 400 }
      )
    }

    // Hash the PIN
    const hashedPin = await bcrypt.hash(pin, 10)

    // Update user with new PIN
    const userRepo = await getRepository(User)
    await userRepo.update(
      { id: userId },
      { ownerPin: hashedPin }
    )

    return NextResponse.json({
      success: true,
      message: 'PIN configurado correctamente'
    })
  } catch (error) {
    console.error('Set owner PIN error:', error)
    return NextResponse.json(
      { error: 'Error configurando PIN' },
      { status: 500 }
    )
  }
}
