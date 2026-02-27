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
    console.log('[Register] Starting registration')
    const body = await request.json()
    console.log('[Register] Body:', { email: body.email, storeName: body.storeName, plan: body.plan })

    const validated = signUpSchema.parse(body)
    console.log('[Register] Validation passed')

    // Extract plan from body (not part of signUpSchema validation)
    const plan: Plan = (['basico', 'pro'] as Plan[]).includes(body.plan) ? body.plan : 'free'
    console.log('[Register] Plan:', plan)

    const dataSource = await getDataSource()
    console.log('[Register] DataSource connected')

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
      try {
        console.log('[Register] Starting transaction')
        // Hash password
        const hashedPassword = await bcrypt.hash(validated.password, 10)
        console.log('[Register] Password hashed')

        // Create user
        const user = manager.create(User, {
          name: validated.name,
          email: validated.email,
          password: hashedPassword,
          role: UserRole.STORE_OWNER,
        })
        console.log('[Register] User entity created, saving...')
        await manager.save(user)
        console.log('[Register] User saved with ID:', user.id)

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
        console.log('[Register] Creating store with slug:', slug)
        const store = manager.create(Store, {
          name: validated.storeName,
          slug,
          ownerId: user.id,
          subscriptionPlan,
          isPermanent,
          subscriptionStatus: subscriptionStatus as Store['subscriptionStatus'],
          subscriptionEndDate,
        })
        console.log('[Register] Store entity created, saving...')
        await manager.save(store)
        console.log('[Register] Store saved with ID:', store.id)

        // Create employment linking user to store
        console.log('[Register] Creating employment')
        const employment = manager.create(Employment, {
          userId: user.id,
          storeId: store.id,
          role: EmploymentRole.ADMIN,
          isActive: true,
          startDate: new Date(),
        })
        console.log('[Register] Employment entity created, saving...')
        await manager.save(employment)
        console.log('[Register] Employment saved')

        return { user, store, employment }
      } catch (txError) {
        console.error('[Register] Transaction error:', txError)
        throw txError
      }
    })

    console.log('[Register] Transaction completed successfully')

    // Build LemonSqueezy checkout URL for paid plans
    let checkoutUrl: string | null = null
    if (plan !== 'free') {
      try {
        console.log('[Register] Building checkout URL for plan:', plan)
        checkoutUrl = buildCheckoutUrl(
          plan === 'basico' ? 'BASICO' : 'PRO',
          result.store.id,
          result.store.slug,
          result.user.email,
          result.user.name,
        )
        console.log('[Register] Checkout URL built')
      } catch (error) {
        // Log but don't fail registration — user can upgrade from dashboard
        console.error('[Register] Failed to build checkout URL:', error)
      }
    }

    console.log('[Register] Registration completed successfully')
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
    console.error('[Register] CAUGHT ERROR:', error)
    console.error('[Register] Error type:', error instanceof Error ? error.constructor.name : typeof error)
    if (error instanceof Error) {
      console.error('[Register] Error message:', error.message)
      console.error('[Register] Error stack:', error.stack)
    }

    if (error instanceof Error && error.name === 'ZodError') {
      console.error('[Register] ZodError details:', error)
      return NextResponse.json(
        { error: 'Invalid input data', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
