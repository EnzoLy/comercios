import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Store } from '@/lib/db/entities/store.entity'
import { Employment, EmploymentRole } from '@/lib/db/entities/employment.entity'
import { createStoreSchema } from '@/lib/validations/store.schema'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function GET() {
  try {
    const session = await requireAuth()
    const dataSource = await getDataSource()

    // Get all stores where user is owner or employee
    const storeRepo = dataSource.getRepository(Store)
    const stores = await storeRepo
      .createQueryBuilder('store')
      .leftJoinAndSelect('store.employments', 'employment')
      .where('store.ownerId = :userId', { userId: session.user.id })
      .orWhere('employment.userId = :userId AND employment.isActive = :isActive', {
        userId: session.user.id,
        isActive: true,
      })
      .getMany()

    return NextResponse.json(stores)
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
    const session = await requireAuth()
    const body = await request.json()
    const validated = createStoreSchema.parse(body)

    const dataSource = await getDataSource()

    // Use transaction to create store + employment
    const result = await dataSource.transaction(async (manager) => {
      // Generate unique slug
      let slug = generateSlug(validated.name)
      let slugExists = true
      let counter = 1

      while (slugExists) {
        const existing = await manager.findOne(Store, { where: { slug } })
        if (!existing) {
          slugExists = false
        } else {
          slug = `${generateSlug(validated.name)}-${counter}`
          counter++
        }
      }

      // Create store
      const store = manager.create(Store, {
        ...validated,
        slug,
        ownerId: session.user.id,
      })
      await manager.save(store)

      // Create employment linking user to store as ADMIN
      const employment = manager.create(Employment, {
        userId: session.user.id,
        storeId: store.id,
        role: EmploymentRole.ADMIN,
        isActive: true,
        startDate: new Date(),
      })
      await manager.save(employment)

      return store
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Create store error:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create store' },
      { status: 500 }
    )
  }
}
