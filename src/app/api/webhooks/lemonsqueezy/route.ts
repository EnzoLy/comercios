import { NextRequest, NextResponse } from 'next/server'
import {
  verifyWebhookSignature,
  handleSubscriptionEvent,
} from '@/lib/services/lemonsqueezy.service'

/**
 * LemonSqueezy webhook endpoint.
 * This route is NOT matched by middleware.ts config.matcher so it's public.
 *
 * IMPORTANT: We must read the body as raw text BEFORE parsing JSON,
 * because ReadableStream can only be consumed once and HMAC verification
 * requires the exact raw bytes that were signed.
 */
export async function POST(request: NextRequest) {
  let rawBody: string

  try {
    rawBody = await request.text()
  } catch {
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 })
  }

  const signature = request.headers.get('X-Signature')

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error('[LemonSqueezy webhook] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const eventName = (payload?.meta as Record<string, unknown>)?.event_name as string | undefined

  if (!eventName) {
    return NextResponse.json({ error: 'Missing event_name in meta' }, { status: 400 })
  }

  try {
    await handleSubscriptionEvent(eventName, payload as unknown as Parameters<typeof handleSubscriptionEvent>[1])
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[LemonSqueezy webhook] Handler error for event "${eventName}":`, message)

    // Return 400 for "store not found" — no point retrying
    // Return 500 for DB/infra errors so LemonSqueezy retries
    if (message.includes('not found') || message.includes('missing')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
