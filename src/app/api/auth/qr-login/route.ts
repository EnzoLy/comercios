import { NextRequest, NextResponse } from 'next/server'
import { getDataSource } from '@/lib/db'
import { Employment, EmploymentAccessToken, AuditLog } from '@/lib/db'
import { validateAccessTokenSchema } from '@/lib/validations/access-token.schema'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = validateAccessTokenSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 400 }
      )
    }

    const { token } = validation.data

    const dataSource = await getDataSource()
    const tokenRepo = dataSource.getRepository(EmploymentAccessToken)
    const employmentRepo = dataSource.getRepository(Employment)
    const auditRepo = dataSource.getRepository(AuditLog)

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    const userAgent = request.headers.get('user-agent')

    // Find token
    const accessToken = await tokenRepo.findOne({
      where: { token },
      relations: ['employment', 'employment.user', 'employment.store'],
    })

    // Validations
    if (!accessToken) {
      await auditRepo.save({
        event_type: 'ACCESS_TOKEN_INVALID',
        details: JSON.stringify({ reason: 'Token not found' }),
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    if (accessToken.isRevoked) {
      await auditRepo.save({
        event_type: 'ACCESS_TOKEN_REVOKED',
        user_id: accessToken.employment.userId,
        store_id: accessToken.employment.storeId,
        employment_id: accessToken.employmentId,
        details: JSON.stringify({ tokenId: accessToken.id }),
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      return NextResponse.json({ error: 'Token revocado' }, { status: 401 })
    }

    if (new Date() > accessToken.expiresAt) {
      await auditRepo.save({
        event_type: 'ACCESS_TOKEN_EXPIRED',
        user_id: accessToken.employment.userId,
        store_id: accessToken.employment.storeId,
        employment_id: accessToken.employmentId,
        details: JSON.stringify({
          tokenId: accessToken.id,
          expiredAt: accessToken.expiresAt,
        }),
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      return NextResponse.json({ error: 'Token expirado' }, { status: 401 })
    }

    if (accessToken.usedAt && !accessToken.allowMultipleUses) {
      await auditRepo.save({
        event_type: 'ACCESS_TOKEN_ALREADY_USED',
        user_id: accessToken.employment.userId,
        store_id: accessToken.employment.storeId,
        employment_id: accessToken.employmentId,
        details: JSON.stringify({
          tokenId: accessToken.id,
          usedAt: accessToken.usedAt,
        }),
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      return NextResponse.json({ error: 'Token ya usado' }, { status: 401 })
    }

    // Verify employment is active
    if (!accessToken.employment.isActive) {
      return NextResponse.json(
        { error: 'Empleado inactivo' },
        { status: 403 }
      )
    }

    // Mark token as used
    accessToken.usedAt = new Date()
    accessToken.ipAddress = ipAddress
    accessToken.userAgent = userAgent
    await tokenRepo.save(accessToken)

    // Audit log of success
    await auditRepo.save({
      event_type: 'ACCESS_TOKEN_USED_SUCCESS',
      user_id: accessToken.employment.userId,
      store_id: accessToken.employment.storeId,
      employment_id: accessToken.employmentId,
      details: JSON.stringify({
        tokenId: accessToken.id,
        employeeName: accessToken.employment.user.name,
      }),
      ip_address: accessToken.ipAddress,
      user_agent: accessToken.userAgent,
    })

    // Return data for session creation
    return NextResponse.json(
      {
        success: true,
        data: {
          userId: accessToken.employment.userId,
          email: accessToken.employment.user.email,
          name: accessToken.employment.user.name,
          storeSlug: accessToken.employment.store.slug,
          storeId: accessToken.employment.storeId,
          employmentId: accessToken.employmentId,
          role: accessToken.employment.role,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('QR login error:', error)
    return NextResponse.json(
      { error: 'Error al procesar token' },
      { status: 500 }
    )
  }
}
