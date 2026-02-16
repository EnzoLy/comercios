import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Store } from '@/lib/db/entities/store.entity'
import { User } from '@/lib/db/entities/user.entity'
import { Employment, EmploymentRole } from '@/lib/db/entities/employment.entity'
import { createStoreSchema } from '@/lib/validations/admin-store.schema'
import { SubscriptionService } from '@/lib/services/subscription.service'

export async function GET() {
  try {
    await requireSuperAdmin()

    const dataSource = await getDataSource()
    const storeRepo = dataSource.getRepository(Store)

    const stores = await storeRepo.find({
      relations: ['owner', 'employments'],
      order: { createdAt: 'DESC' },
    })

    const formatted = stores.map(store => {
      const daysRemaining = SubscriptionService.calculateDaysRemaining(store.subscriptionEndDate)

      return {
        id: store.id,
        name: store.name,
        slug: store.slug,
        isActive: store.isActive,
        owner: {
          id: store.owner.id,
          name: store.owner.name,
          email: store.owner.email,
        },
        createdAt: store.createdAt,
        employmentCount: store.employments?.length || 0,
        subscription: {
          status: store.subscriptionStatus,
          startDate: store.subscriptionStartDate,
          endDate: store.subscriptionEndDate,
          isPermanent: store.isPermanent,
          daysRemaining,
        },
      }
    })

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('Get stores error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stores' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await requireSuperAdmin()

    const body = await request.json()
    const validated = createStoreSchema.parse(body)

    const dataSource = await getDataSource()
    const storeRepo = dataSource.getRepository(Store)
    const userRepo = dataSource.getRepository(User)
    const employmentRepo = dataSource.getRepository(Employment)

    let ownerId: string

    // Determinar si crear nuevo usuario o usar existente
    if (validated.ownerId) {
      // Usar usuario existente
      const owner = await userRepo.findOne({ where: { id: validated.ownerId } })
      if (!owner) {
        return NextResponse.json({ error: 'Usuario propietario no encontrado' }, { status: 404 })
      }
      ownerId = validated.ownerId
    } else if (validated.ownerName && validated.ownerEmail && validated.ownerPassword) {
      // Crear nuevo usuario
      // Verificar que el email no esté en uso
      const existingUser = await userRepo.findOne({ where: { email: validated.ownerEmail } })
      if (existingUser) {
        return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 })
      }

      // Hash de la contraseña
      const bcrypt = require('bcryptjs')
      const hashedPassword = await bcrypt.hash(validated.ownerPassword, 10)

      // Crear usuario
      const newUser = userRepo.create({
        name: validated.ownerName,
        email: validated.ownerEmail,
        password: hashedPassword,
        role: 'STORE_OWNER' as any,
        isActive: true,
        mustChangePassword: true, // Forzar cambio de contraseña en primer login
      })
      const savedUser = await userRepo.save(newUser)
      ownerId = savedUser.id
    } else {
      return NextResponse.json({
        error: 'Debes proporcionar un ID de usuario o datos completos para crear uno nuevo'
      }, { status: 400 })
    }

    // Verificar que el slug no esté en uso
    const existing = await storeRepo.findOne({ where: { slug: validated.slug } })
    if (existing) {
      return NextResponse.json({ error: 'El slug ya está en uso' }, { status: 400 })
    }

    // Crear tienda
    const store = storeRepo.create({
      name: validated.name,
      slug: validated.slug,
      ownerId,
      description: validated.description,
      phone: validated.phone,
      email: validated.email,
      isActive: true,
    })
    await storeRepo.save(store)

    // Crear employment del owner como ADMIN
    const employment = employmentRepo.create({
      userId: ownerId,
      storeId: store.id,
      role: EmploymentRole.ADMIN,
      isActive: true,
      startDate: new Date(),
    })
    await employmentRepo.save(employment)

    return NextResponse.json(
      {
        id: store.id,
        name: store.name,
        slug: store.slug,
        isActive: store.isActive,
        newUserCreated: !validated.ownerId
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Create store error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Entrada inválida', details: error }, { status: 400 })
    }

    return NextResponse.json({ error: 'Error al crear la tienda' }, { status: 500 })
  }
}
