import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getRepository } from '@/lib/db'
import { Employment, EmploymentRole } from '@/lib/db/entities/employment.entity'
import { setPinSchema } from '@/lib/validations/pin.schema'
import { requireAuth, requireStoreAccess, requireRole } from '@/lib/auth/permissions'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string; employmentId: string }> }
) {
  try {
    // Verify authentication
    requireAuth()

    const { storeId, employmentId } = await params

    // Verify store access
    await requireStoreAccess(storeId)

    // Verify ADMIN role
    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const body = await request.json()
    const validation = setPinSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'PIN validation failed', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { pin } = validation.data

    // Get employment
    const employmentRepo = await getRepository(Employment)
    const employment = await employmentRepo.findOne({
      where: { id: employmentId, storeId },
      relations: ['user']
    })

    if (!employment) {
      return NextResponse.json(
        { error: 'Employment not found' },
        { status: 404 }
      )
    }

    // Hash PIN with bcrypt
    const hashedPin = await bcrypt.hash(pin, 10)

    // Update employment with new PIN
    employment.pin = hashedPin
    employment.requiresPin = true

    await employmentRepo.save(employment)

    console.log(`PIN configured for employment ${employmentId} (user: ${employment.user.email})`)

    return NextResponse.json({
      success: true,
      message: 'PIN configurado exitosamente',
      employment: {
        id: employment.id,
        userId: employment.userId,
        storeId: employment.storeId,
        role: employment.role,
        isActive: employment.isActive,
        requiresPin: employment.requiresPin,
        user: {
          id: employment.user.id,
          name: employment.user.name,
          email: employment.user.email
        }
      }
    })
  } catch (error) {
    console.error('Error setting PIN:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
