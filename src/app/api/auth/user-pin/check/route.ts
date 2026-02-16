import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { getDataSource } from '@/lib/db'
import { User } from '@/lib/db/entities/user.entity'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const dataSource = await getDataSource()
    const userRepo = dataSource.getRepository(User)

    const user = await userRepo.findOne({
      where: { id: session.user.id },
      select: ['id', 'ownerPin'],
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      hasPin: !!user.ownerPin,
    })
  } catch (error) {
    console.error('Check PIN error:', error)
    return NextResponse.json(
      { error: 'Error al verificar el PIN' },
      { status: 500 }
    )
  }
}
