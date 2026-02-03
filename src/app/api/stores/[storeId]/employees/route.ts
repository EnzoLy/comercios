import { NextResponse } from 'next/server'
import { requireStoreAccess, requireRole, getStoreIdFromHeaders, isStoreOwner } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Employment } from '@/lib/db/entities/employment.entity'
import { User, UserRole } from '@/lib/db/entities/user.entity'
import bcrypt from 'bcryptjs'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'
import { inviteEmployeeSchema } from '@/lib/validations/employee.schema'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId: paramStoreId } = await params
    const headerStoreId = getStoreIdFromHeaders(request)
    const storeId = headerStoreId || paramStoreId

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const employmentRepo = dataSource.getRepository(Employment)

    const employments = await employmentRepo.find({
      where: { storeId },
      relations: ['user', 'store'],
      order: { createdAt: 'DESC' },
    })

    // Hide password from response
    const sanitized = employments.map((emp) => ({
      ...emp,
      user: emp.user ? {
        id: emp.user.id,
        name: emp.user.name,
        email: emp.user.email,
        role: emp.user.role,
      } : null,
    }))

    return NextResponse.json(sanitized)
  } catch (error) {
    console.error('Get employees error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId: paramStoreId } = await params
    const headerStoreId = getStoreIdFromHeaders(request)
    const storeId = headerStoreId || paramStoreId

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    // Only admins and owners can invite employees
    const owner = await isStoreOwner(storeId)
    if (!owner) {
      await requireRole(storeId, [EmploymentRole.ADMIN])
    }

    const body = await request.json()
    const validated = inviteEmployeeSchema.parse(body)

    const dataSource = await getDataSource()
    const userRepo = dataSource.getRepository(User)
    const employmentRepo = dataSource.getRepository(Employment)

    // Check if user exists
    let user = await userRepo.findOne({
      where: { email: validated.email },
    })

    if (!user) {
      // Create new user if they don't exist
      const hashedPassword = await bcrypt.hash(validated.password, 10)
      user = userRepo.create({
        name: validated.name,
        email: validated.email,
        password: hashedPassword,
        role: UserRole.EMPLOYEE,
        mustChangePassword: true,
      })
      await userRepo.save(user)
    }

    // Check if employment already exists
    const existing = await employmentRepo.findOne({
      where: { userId: user.id, storeId },
    })

    if (existing) {
      if (existing.isActive) {
        return NextResponse.json(
          { error: 'El usuario ya está trabajando en esta tienda' },
          { status: 400 }
        )
      } else {
        // Reactivate existing employment
        existing.isActive = true
        existing.role = validated.role
        existing.startDate = validated.startDate ? new Date(validated.startDate) : new Date()
        existing.endDate = undefined
        await employmentRepo.save(existing)

        return NextResponse.json(existing)
      }
    }

    // Create new employment
    const employment = employmentRepo.create({
      userId: user.id,
      storeId,
      role: validated.role,
      isActive: true,
      startDate: validated.startDate ? new Date(validated.startDate) : new Date(),
    })

    await employmentRepo.save(employment)

    // Fetch with relations
    const complete = await employmentRepo.findOne({
      where: { id: employment.id },
      relations: ['user', 'store'],
    })

    return NextResponse.json(complete, { status: 201 })
  } catch (error) {
    console.error('Invite employee error:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to invite employee' },
      { status: 500 }
    )
  }
}
