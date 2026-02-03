import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { getDataSource } from '@/lib/db'
import { Employment, EmploymentAccessToken, AuditLog } from '@/lib/db'
import { generateAccessTokenSchema } from '@/lib/validations/access-token.schema'
import { requireAuth, requireStoreAccess } from '@/lib/auth/permissions'
import crypto from 'crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string; employmentId: string }> }
) {
  try {
    // Verify authentication
    requireAuth()

    const { storeId, employmentId } = await params
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verify store access
    await requireStoreAccess(storeId)

    const body = await request.json()
    const validation = generateAccessTokenSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validación fallida', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { expiresInHours } = validation.data

    const dataSource = await getDataSource()
    const employmentRepo = dataSource.getRepository(Employment)
    const tokenRepo = dataSource.getRepository(EmploymentAccessToken)
    const auditRepo = dataSource.getRepository(AuditLog)

    // Verify that the employment exists and is active
    const employment = await employmentRepo.findOne({
      where: { id: employmentId, storeId, isActive: true },
      relations: ['user', 'store'],
    })

    if (!employment) {
      return NextResponse.json(
        { error: 'Empleado no encontrado o inactivo' },
        { status: 404 }
      )
    }

    // Verify that the user can only generate for themselves or is an admin
    const isAdmin = session.user.role === 'SUPER_ADMIN' || session.user.role === 'STORE_OWNER'
    const isOwnEmployment = employment.userId === session.user.id

    if (!isAdmin && !isOwnEmployment) {
      return NextResponse.json(
        { error: 'Solo puedes generar QR para tu propio acceso' },
        { status: 403 }
      )
    }

    // Revoke all previous active tokens for this employment (keep only one active)
    const previousTokens = await tokenRepo.find({
      where: { employmentId, isRevoked: false },
    })

    for (const prevToken of previousTokens) {
      prevToken.isRevoked = true
      await tokenRepo.save(prevToken)
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + expiresInHours)

    // Create token record
    const accessToken = tokenRepo.create({
      token,
      employmentId,
      createdBy: session.user.id,
      expiresAt,
      allowMultipleUses: false, // Always single use for security
    })

    await tokenRepo.save(accessToken)

    // Audit log
    await auditRepo.save({
      eventType: 'ACCESS_TOKEN_GENERATED',
      userId: session.user.id,
      storeId,
      employmentId,
      details: JSON.stringify({
        tokenId: accessToken.id,
        expiresInHours,
        revokedPreviousTokens: previousTokens.length,
      }),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    })

    // Build full QR URL
    const baseUrl = process.env.NEXTAUTH_URL || request.headers.get('origin')
    const qrUrl = `${baseUrl}/auth/qr?token=${token}`

    return NextResponse.json(
      {
        success: true,
        data: {
          tokenId: accessToken.id,
          token,
          qrUrl,
          expiresAt: accessToken.expiresAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Generate access token error:', error)
    return NextResponse.json(
      { error: 'Error al generar token de acceso' },
      { status: 500 }
    )
  }
}
