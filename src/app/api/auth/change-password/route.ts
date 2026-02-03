import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { getDataSource } from '@/lib/db'
import { User } from '@/lib/db/entities/user.entity'
import bcrypt from 'bcryptjs'
import { changePasswordSchema } from '@/lib/validations/password.schema'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validated = changePasswordSchema.parse(body)

    const dataSource = await getDataSource()
    const userRepo = dataSource.getRepository(User)

    const user = await userRepo.findOne({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(validated.currentPassword, user.password)
    if (!isValidPassword) {
      return NextResponse.json({ error: 'La contraseña actual es incorrecta' }, { status: 400 })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(validated.newPassword, 10)
    user.password = hashedPassword
    user.mustChangePassword = false
    await userRepo.save(user)

    return NextResponse.json({ message: 'Contraseña actualizada con éxito' })
  } catch (error) {
    console.error('Change password error:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Datos inválidos', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al cambiar la contraseña' }, { status: 500 })
  }
}
