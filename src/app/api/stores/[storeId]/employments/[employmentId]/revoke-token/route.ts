import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth/auth.config'
import { getDataSource } from '@/lib/db'
import { EmploymentAccessToken, AuditLog } from '@/lib/db'
import { revokeAccessTokenSchema } from '@/lib/validations/access-token.schema'
import { requireAuth, requireStoreAccess, requireRole } from '@/lib/auth/permissions'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string; employmentId: string }> }
) {
  try {
    // Verify authentication
    requireAuth()

    const { storeId } = await params
    const session = await getServerSession(authConfig)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verify store access
    await requireStoreAccess(storeId)

    // Only ADMIN and MANAGER can revoke tokens
    await requireRole(storeId, [EmploymentRole.ADMIN, EmploymentRole.MANAGER])

    const body = await request.json()
    const validation = revokeAccessTokenSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validación fallida', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { tokenId } = validation.data

    const dataSource = await getDataSource()
    const tokenRepo = dataSource.getRepository(EmploymentAccessToken)
    const auditRepo = dataSource.getRepository(AuditLog)

    const token = await tokenRepo.findOne({ where: { id: tokenId } })

    if (!token) {
      return NextResponse.json({ error: 'Token no encontrado' }, { status: 404 })
    }

    token.isRevoked = true
    await tokenRepo.save(token)

    await auditRepo.save({
      eventType: 'ACCESS_TOKEN_REVOKED_MANUAL',
      userId: session.user.id,
      storeId,
      employmentId: token.employmentId,
      details: JSON.stringify({ tokenId }),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Revoke access token error:', error)
    return NextResponse.json(
      { error: 'Error al revocar token' },
      { status: 500 }
    )
  }
}
