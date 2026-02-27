import { createHmac } from 'crypto'
import { getRepository } from '@/lib/db'
import { Store } from '@/lib/db/entities/store.entity'

// ─── Types ───────────────────────────────────────────────────────────────────

interface LemonSqueezySubscriptionAttributes {
  status: string
  renews_at: string | null
  ends_at: string | null
  trial_ends_at: string | null
  product_id: number
  variant_id: number
  customer_id: number
  user_email: string
  custom_data?: { store_id?: string }
}

interface LemonSqueezyInvoiceAttributes {
  status: 'paid' | 'pending' | 'void' | 'refunded'
  billing_reason: 'initial' | 'renewal'
  subscription_id: number
  customer_id: number
  total_usd: number
  currency: string
  user_email: string
  user_name: string
}

interface LemonSqueezyWebhookPayload {
  data: {
    id: string
    type: string
    attributes: LemonSqueezySubscriptionAttributes | LemonSqueezyInvoiceAttributes
  }
  meta: {
    event_name: string
    custom_data?: { store_id?: string }
  }
}

// ─── Checkout URL ─────────────────────────────────────────────────────────────

/**
 * Builds a LemonSqueezy checkout URL pre-filled with store metadata.
 * The store_id is passed as custom_data and will be echoed back in webhooks.
 */
export function buildCheckoutUrl(
  plan: 'BASICO' | 'PRO',
  storeId: string,
  storeSlug: string,
  userEmail: string,
  userName: string
): string {
  const variantId =
    plan === 'BASICO'
      ? process.env.LEMONSQUEEZY_BASICO_VARIANT_ID
      : process.env.LEMONSQUEEZY_PRO_VARIANT_ID

  const subdomain = process.env.LEMONSQUEEZY_STORE_SUBDOMAIN
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (!variantId || !subdomain) {
    throw new Error(
      'Missing LEMONSQUEEZY_BASICO_VARIANT_ID / LEMONSQUEEZY_PRO_VARIANT_ID or LEMONSQUEEZY_STORE_SUBDOMAIN env vars'
    )
  }

  const successUrl = `${appUrl}/dashboard/${storeSlug}`

  const params = new URLSearchParams({
    'checkout[custom][store_id]': storeId,
    'checkout[email]': userEmail,
    'checkout[name]': userName,
    'checkout[success_url]': successUrl,
  })

  return `https://${subdomain}/checkout/buy/${variantId}?${params.toString()}`
}

// ─── Webhook Signature ────────────────────────────────────────────────────────

/**
 * Verifies the HMAC-SHA256 signature sent by LemonSqueezy in X-Signature header.
 * The raw body string (before JSON.parse) must be used for verification.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  if (!signatureHeader) return false

  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET
  if (!secret) {
    console.error('LEMONSQUEEZY_WEBHOOK_SECRET is not set')
    return false
  }

  const hmac = createHmac('sha256', secret)
  hmac.update(rawBody)
  const digest = hmac.digest('hex')

  return digest === signatureHeader
}

// ─── LS API Fetch ─────────────────────────────────────────────────────────────

/**
 * Fetches the latest subscription data from the LemonSqueezy API.
 * Used when invoice webhooks don't include renews_at / variant_id directly.
 */
async function fetchLSSubscription(subscriptionId: number): Promise<LemonSqueezySubscriptionAttributes | null> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY
  if (!apiKey) {
    console.error('[LemonSqueezy] fetchLSSubscription: LEMONSQUEEZY_API_KEY not set in environment')
    return null
  }

  try {
    console.log(`[LemonSqueezy] Fetching subscription ${subscriptionId} from LS API`)
    const res = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/vnd.api+json',
        },
      }
    )
    if (!res.ok) {
      console.error(`[LemonSqueezy] fetchLSSubscription ${subscriptionId} → HTTP ${res.status}`)
      return null
    }
    const json = await res.json()
    const attrs = json?.data?.attributes as LemonSqueezySubscriptionAttributes | undefined
    console.log(`[LemonSqueezy] Subscription ${subscriptionId} fetched: variant_id=${attrs?.variant_id}, status=${attrs?.status}`)
    return attrs ?? null
  } catch (err) {
    console.error('[LemonSqueezy] fetchLSSubscription error:', err instanceof Error ? err.message : err)
    return null
  }
}

// ─── Event Handler ────────────────────────────────────────────────────────────

/**
 * Maps LemonSqueezy subscription events to Store entity fields.
 * Writes to both the new LS-specific fields AND the existing
 * subscriptionStatus/subscriptionEndDate so the SubscriptionService
 * and middleware continue to work without changes.
 */
export async function handleSubscriptionEvent(
  eventName: string,
  payload: LemonSqueezyWebhookPayload
): Promise<void> {
  // Extract store_id from custom_data (LS sends it in both places)
  const storeId =
    payload.meta?.custom_data?.store_id ??
    (payload.data?.attributes as LemonSqueezySubscriptionAttributes)?.custom_data?.store_id

  if (!storeId) {
    throw new Error('Webhook payload missing store_id in custom_data')
  }

  const storeRepo = await getRepository(Store)
  const store = await storeRepo.findOne({ where: { id: storeId } })

  if (!store) {
    throw new Error(`Store not found for id: ${storeId}`)
  }

  const attrs = payload.data.attributes

  switch (eventName) {
    // ── Subscription lifecycle events ──────────────────────────────────────
    case 'subscription_created':
    case 'subscription_updated':
    case 'subscription_resumed': {
      const subAttrs = attrs as LemonSqueezySubscriptionAttributes
      const lsSubscriptionId = payload.data.id
      const lsCustomerId = String(subAttrs.customer_id)
      const lsVariantId = String(subAttrs.variant_id)

      store.lemonSqueezySubscriptionId = lsSubscriptionId
      store.lemonSqueezyCustomerId = lsCustomerId
      store.lemonSqueezyVariantId = lsVariantId
      store.lemonSqueezyStatus = subAttrs.status

      if (lsVariantId === process.env.LEMONSQUEEZY_BASICO_VARIANT_ID) {
        store.subscriptionPlan = 'BASICO'
      } else if (lsVariantId === process.env.LEMONSQUEEZY_PRO_VARIANT_ID) {
        store.subscriptionPlan = 'PRO'
      }

      // Use ends_at if set (cancelled-but-running), else renews_at
      const renewsAt = subAttrs.renews_at ? new Date(subAttrs.renews_at) : null
      const endsAt = subAttrs.ends_at ? new Date(subAttrs.ends_at) : null
      const effectiveEnd = endsAt ?? renewsAt

      store.subscriptionStartDate = store.subscriptionStartDate ?? new Date()
      store.subscriptionEndDate = effectiveEnd ?? undefined
      store.isPermanent = false
      store.subscriptionStatus = 'ACTIVE'
      break
    }

    case 'subscription_cancelled': {
      const subAttrs = attrs as LemonSqueezySubscriptionAttributes
      store.lemonSqueezyStatus = subAttrs.status
      const endsAt = subAttrs.ends_at ? new Date(subAttrs.ends_at) : store.subscriptionEndDate
      store.subscriptionEndDate = endsAt ?? undefined
      store.isPermanent = false
      store.subscriptionStatus = 'EXPIRING_SOON'
      break
    }

    case 'subscription_expired': {
      const subAttrs = attrs as LemonSqueezySubscriptionAttributes
      store.lemonSqueezyStatus = subAttrs.status
      store.subscriptionStatus = 'EXPIRED'
      store.isPermanent = false
      break
    }

    // ── Invoice / payment events ────────────────────────────────────────────
    case 'subscription_payment_success': {
      const invoiceAttrs = attrs as LemonSqueezyInvoiceAttributes

      // Fetch the full subscription from the LS API to get renews_at and variant_id
      const sub = await fetchLSSubscription(invoiceAttrs.subscription_id)

      if (sub) {
        const lsSubscriptionId = String(invoiceAttrs.subscription_id)
        const lsVariantId = String(sub.variant_id)

        store.lemonSqueezySubscriptionId = lsSubscriptionId
        store.lemonSqueezyCustomerId = String(invoiceAttrs.customer_id)
        store.lemonSqueezyVariantId = lsVariantId
        store.lemonSqueezyStatus = sub.status

        if (lsVariantId === process.env.LEMONSQUEEZY_BASICO_VARIANT_ID) {
          store.subscriptionPlan = 'BASICO'
          console.log(`[LemonSqueezy] Plan updated to BASICO (variant ${lsVariantId})`)
        } else if (lsVariantId === process.env.LEMONSQUEEZY_PRO_VARIANT_ID) {
          store.subscriptionPlan = 'PRO'
          console.log(`[LemonSqueezy] Plan updated to PRO (variant ${lsVariantId})`)
        } else {
          console.warn(
            `[LemonSqueezy] Variant ${lsVariantId} doesn't match env vars — BASICO=${process.env.LEMONSQUEEZY_BASICO_VARIANT_ID} PRO=${process.env.LEMONSQUEEZY_PRO_VARIANT_ID}`
          )
        }

        const renewsAt = sub.renews_at ? new Date(sub.renews_at) : null
        const endsAt = sub.ends_at ? new Date(sub.ends_at) : null
        store.subscriptionEndDate = (endsAt ?? renewsAt) ?? undefined
      } else {
        // API unavailable — at minimum confirm access is active
        console.warn(
          `[LemonSqueezy] Could not fetch subscription ${invoiceAttrs.subscription_id} from LS API — plan will not be updated`
        )
        store.lemonSqueezySubscriptionId = String(invoiceAttrs.subscription_id)
        store.lemonSqueezyCustomerId = String(invoiceAttrs.customer_id)
      }

      store.subscriptionStartDate = store.subscriptionStartDate ?? new Date()
      store.isPermanent = false
      store.subscriptionStatus = 'ACTIVE'

      console.log(
        `[LemonSqueezy] subscription_payment_success — store ${storeId}, plan=${store.subscriptionPlan}, status=${store.subscriptionStatus}, reason: ${invoiceAttrs.billing_reason}`
      )
      break
    }

    case 'subscription_payment_failed': {
      // Don't block access yet — LemonSqueezy will retry and eventually expire.
      console.warn(
        `[LemonSqueezy] Payment failed for store ${storeId}`
      )
      break
    }

    default:
      console.log(`[LemonSqueezy] Unhandled event: ${eventName}`)
  }

  console.log(
    `[LemonSqueezy] Saving store ${storeId}: plan=${store.subscriptionPlan}, status=${store.subscriptionStatus}, isPermanent=${store.isPermanent}, lsSubId=${store.lemonSqueezySubscriptionId}`
  )
  await storeRepo.save(store)
  console.log(`[LemonSqueezy] Store ${storeId} saved successfully to database`)
}
