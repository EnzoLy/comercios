import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { signUpSchema } from '@/lib/validations/auth.schema'
import { getDataSource } from '@/lib/db'
import { User, UserRole } from '@/lib/db/entities/user.entity'
import { Store } from '@/lib/db/entities/store.entity'
import { Employment, EmploymentRole } from '@/lib/db/entities/employment.entity'
import { buildCheckoutUrl } from '@/lib/services/lemonsqueezy.service'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

type Plan = 'free' | 'basico' | 'pro'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = signUpSchema.parse(body)

    // Extract plan from body (not part of signUpSchema validation)
    const plan: Plan = (['basico', 'pro'] as Plan[]).includes(body.plan) ? body.plan : 'free'

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

      // Subscription setup based on selected plan
      // FREE: permanent access (gated by plan type at UI level, not by expiry)
      // Paid: 7-day grace period — webhook overwrites with real end date after payment
      const isPermanent = plan === 'free'
      const subscriptionStatus = plan === 'free' ? 'PERMANENT' : 'ACTIVE'
      const subscriptionPlan = plan === 'free' ? 'FREE' : plan === 'basico' ? 'BASICO' : 'PRO'
      const subscriptionEndDate =
        plan !== 'free'
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7-day grace period
          : undefined

      // Create store
      const store = manager.create(Store, {
        name: validated.storeName,
        slug,
        ownerId: user.id,
        subscriptionPlan,
        isPermanent,
        subscriptionStatus: subscriptionStatus as Store['subscriptionStatus'],
        subscriptionEndDate,
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

    // Build LemonSqueezy checkout URL for paid plans
    let checkoutUrl: string | null = null
    if (plan !== 'free') {
      try {
        checkoutUrl = buildCheckoutUrl(
          plan === 'basico' ? 'BASICO' : 'PRO',
          result.store.id,
          result.store.slug,
          result.user.email,
          result.user.name,
        )
      } catch (error) {
        // Log but don't fail registration — user can upgrade from dashboard
        console.error('Failed to build checkout URL:', error)
      }
    }

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
        checkoutUrl,
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
