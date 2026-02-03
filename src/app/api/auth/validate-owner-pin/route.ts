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

    if (!pin || typeof pin !== 'string' || pin.length !== 4) {
      return NextResponse.json(
        { error: 'PIN debe ser de 4 dígitos' },
        { status: 400 }
      )
    }

    // Get user with PIN
    const userRepo = await getRepository(User)
    const user = await userRepo.findOne({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Check if user has PIN configured
    if (!user.ownerPin) {
      return NextResponse.json(
        { error: 'owner_has_no_pin', message: 'Este usuario no tiene PIN configurado' },
        { status: 403 }
      )
    }

    // Verify PIN
    const pinMatch = await bcrypt.compare(pin, user.ownerPin)

    if (!pinMatch) {
      return NextResponse.json(
        { success: false, message: 'PIN incorrecto' },
        { status: 401 }
      )
    }

    // PIN correct
    return NextResponse.json({
      success: true,
      message: 'PIN verificado correctamente'
    })
  } catch (error) {
    console.error('Owner PIN validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
