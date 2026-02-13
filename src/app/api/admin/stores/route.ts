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

    // Verify owner exists
    const owner = await userRepo.findOne({ where: { id: validated.ownerId } })
    if (!owner) {
      return NextResponse.json({ error: 'Owner user not found' }, { status: 404 })
    }

    // Check slug uniqueness
    const existing = await storeRepo.findOne({ where: { slug: validated.slug } })
    if (existing) {
      return NextResponse.json({ error: 'Slug already in use' }, { status: 400 })
    }

    // Create store
    const store = storeRepo.create({
      name: validated.name,
      slug: validated.slug,
      ownerId: validated.ownerId,
      description: validated.description,
      phone: validated.phone,
      email: validated.email,
      isActive: true,
    })
    await storeRepo.save(store)

    // Create owner employment as ADMIN
    const employment = employmentRepo.create({
      userId: validated.ownerId,
      storeId: store.id,
      role: EmploymentRole.ADMIN,
      isActive: true,
      startDate: new Date(),
    })
    await employmentRepo.save(employment)

    return NextResponse.json(
      { id: store.id, name: store.name, slug: store.slug, isActive: store.isActive },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Create store error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input', details: error }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to create store' }, { status: 500 })
  }
}
