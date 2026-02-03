import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getRepository } from '@/lib/db'
import { Employment } from '@/lib/db/entities/employment.entity'
import { AuditLog } from '@/lib/db/entities/audit-log.entity'
import { validatePinSchema } from '@/lib/validations/pin.schema'
import { getUserIdFromHeaders, getStoreIdFromHeaders, requireAuth, requireStoreAccess } from '@/lib/auth/permissions'

// In-memory rate limiting: Map<employmentId, { attempts: number; resetTime: number }>
const rateLimitMap = new Map<string, { attempts: number; resetTime: number }>()
const RATE_LIMIT_MAX_ATTEMPTS = 3
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

// Clean up old rate limit entries periodically
function cleanupRateLimit() {
  const now = Date.now()
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetTime < now) {
      rateLimitMap.delete(key)
    }
  }
}

function getRateLimitStatus(employmentId: string) {
  cleanupRateLimit()
  const status = rateLimitMap.get(employmentId)

  if (!status) {
    return { attempts: 0, isBlocked: false }
  }

  const now = Date.now()
  if (status.resetTime < now) {
    rateLimitMap.delete(employmentId)
    return { attempts: 0, isBlocked: false }
  }

  return {
    attempts: status.attempts,
    isBlocked: status.attempts >= RATE_LIMIT_MAX_ATTEMPTS
  }
}

function incrementRateLimit(employmentId: string) {
  const status = rateLimitMap.get(employmentId) || {
    attempts: 0,
    resetTime: Date.now() + RATE_LIMIT_WINDOW_MS
  }
  status.attempts++
  rateLimitMap.set(employmentId, status)
  return status.attempts
}

function resetRateLimit(employmentId: string) {
  rateLimitMap.delete(employmentId)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    // Verify authentication
    requireAuth()

    // Verify store access
    const { storeId } = await params
    await requireStoreAccess(storeId)

    const body = await request.json()
    const validation = validatePinSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid PIN format', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { employmentId, pin } = validation.data

    // Check rate limit
    const rateLimit = getRateLimitStatus(employmentId)
    if (rateLimit.isBlocked) {
      return NextResponse.json(
        { error: 'PIN bloqueado. Intenta de nuevo en 5 minutos.' },
        { status: 429 }
      )
    }

    // Get employment
    const employmentRepo = await getRepository(Employment)
    const employment = await employmentRepo.findOne({
      where: { id: employmentId, storeId },
      relations: ['user', 'store']
    })

    if (!employment) {
      return NextResponse.json(
        { error: 'Employment not found' },
        { status: 404 }
      )
    }

    if (!employment.isActive) {
      return NextResponse.json(
        { error: 'Employment is not active' },
        { status: 403 }
      )
    }

    // Artificial delay to prevent timing attacks and brute force
    const VALIDATION_DELAY_MS = 800
    await new Promise(resolve => setTimeout(resolve, VALIDATION_DELAY_MS))

    // Verify PIN
    const pinMatch = employment.pin ? await bcrypt.compare(pin, employment.pin) : false

    if (!pinMatch) {
      const newAttempts = incrementRateLimit(employmentId)
      const attemptsRemaining = RATE_LIMIT_MAX_ATTEMPTS - newAttempts

      // Log failed attempt to database
      try {
        const auditLogRepo = await getRepository(AuditLog)
        await auditLogRepo.save({
          eventType: 'PIN_VALIDATION_FAILED',
          userId: employment.userId,
          storeId: employment.storeId,
          employmentId,
          details: JSON.stringify({ attempts: newAttempts }),
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
        })
      } catch (error) {
        // Don't let audit logging failures break the request
        console.error('Failed to log PIN validation failure:', error)
      }

      console.warn(`PIN validation failed for employment ${employmentId}. Attempts: ${newAttempts}`)

      return NextResponse.json(
        {
          success: false,
          attemptsRemaining: Math.max(0, attemptsRemaining),
          message: attemptsRemaining > 0
            ? `PIN incorrecto. Te quedan ${attemptsRemaining} intento${attemptsRemaining === 1 ? '' : 's'}.`
            : 'PIN bloqueado por 5 minutos.'
        },
        { status: 401 }
      )
    }

    // PIN correct - reset rate limit
    resetRateLimit(employmentId)

    // Log successful PIN validation
    try {
      const auditLogRepo = await getRepository(AuditLog)
      await auditLogRepo.save({
        eventType: 'PIN_VALIDATION_SUCCESS',
        userId: employment.userId,
        storeId: employment.storeId,
        employmentId,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      })
    } catch (error) {
      // Don't let audit logging failures break the request
      console.error('Failed to log PIN validation success:', error)
    }

    // Return employment data (don't include PIN)
    const { pin: _, ...employmentWithoutPin } = employment

    return NextResponse.json({
      success: true,
      employment: {
        ...employmentWithoutPin,
        user: {
          id: employment.user.id,
          name: employment.user.name,
          email: employment.user.email
        }
      }
    })
  } catch (error) {
    console.error('PIN validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
