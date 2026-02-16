import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { getDataSource } from '@/lib/db'
import { User } from '@/lib/db/entities/user.entity'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPin, newPin } = body

    // Validar nuevo PIN
    if (!newPin || typeof newPin !== 'string') {
      return NextResponse.json(
        { error: 'El nuevo PIN es requerido' },
        { status: 400 }
      )
    }

    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      return NextResponse.json(
        { error: 'El PIN debe ser de 4 dígitos numéricos' },
        { status: 400 }
      )
    }

    const dataSource = await getDataSource()
    const userRepo = dataSource.getRepository(User)

    const user = await userRepo.findOne({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Si el usuario ya tiene PIN, verificar el PIN actual
    if (user.ownerPin) {
      if (!currentPin) {
        return NextResponse.json(
          { error: 'PIN actual requerido' },
          { status: 400 }
        )
      }

      const isValidPin = await bcrypt.compare(currentPin, user.ownerPin)
      if (!isValidPin) {
        return NextResponse.json(
          { error: 'El PIN actual es incorrecto' },
          { status: 400 }
        )
      }
    }

    // Hash del nuevo PIN
    const hashedPin = await bcrypt.hash(newPin, 10)
    user.ownerPin = hashedPin
    await userRepo.save(user)

    return NextResponse.json({
      success: true,
      message: user.ownerPin ? 'PIN actualizado correctamente' : 'PIN configurado correctamente',
    })
  } catch (error) {
    console.error('Set PIN error:', error)
    return NextResponse.json(
      { error: 'Error al configurar el PIN' },
      { status: 500 }
    )
  }
}
