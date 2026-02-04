import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { User } from '@/lib/db/entities/user.entity'

export async function GET() {
  try {
    await requireSuperAdmin()

    const dataSource = await getDataSource()
    const userRepo = dataSource.getRepository(User)

    const users = await userRepo.find({
      select: ['id', 'name', 'email', 'isActive'],
      where: { isActive: true },
      order: { name: 'ASC' },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
