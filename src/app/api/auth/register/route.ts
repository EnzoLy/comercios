import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { signUpSchema } from '@/lib/validations/auth.schema'
import { getDataSource } from '@/lib/db'
import { User, UserRole } from '@/lib/db/entities/user.entity'
import { Store } from '@/lib/db/entities/store.entity'
import { Employment, EmploymentRole } from '@/lib/db/entities/employment.entity'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = signUpSchema.parse(body)

    const dataSource = await getDataSource()

    // Check if user already exists
    const userRepo = dataSource.getRepository(User)
    const existingUser = await userRepo.findOne({
      where: { email: validated.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    // Use transaction to create user + store + employment atomically
    const result = await dataSource.transaction(async (manager) => {
      // Hash password
      const hashedPassword = await bcrypt.hash(validated.password, 10)

      // Create user
      const user = manager.create(User, {
        name: validated.name,
        email: validated.email,
        password: hashedPassword,
        role: UserRole.STORE_OWNER,
      })
      await manager.save(user)

      // Generate unique slug for store
      let slug = generateSlug(validated.storeName)
      let slugExists = true
      let counter = 1

      while (slugExists) {
        const existing = await manager.findOne(Store, { where: { slug } })
        if (!existing) {
          slugExists = false
        } else {
          slug = `${generateSlug(validated.storeName)}-${counter}`
          counter++
        }
      }

      // Create store
      const store = manager.create(Store, {
        name: validated.storeName,
        slug,
        ownerId: user.id,
      })
      await manager.save(store)

      // Create employment linking user to store
      const employment = manager.create(Employment, {
        userId: user.id,
        storeId: store.id,
        role: EmploymentRole.ADMIN,
        isActive: true,
        startDate: new Date(),
      })
      await manager.save(employment)

      return { user, store, employment }
    })

    return NextResponse.json(
      {
        message: 'Registration successful',
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
        store: {
          id: result.store.id,
          name: result.store.name,
          slug: result.store.slug,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
