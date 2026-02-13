import { getRepository } from '@/lib/db'
import { Store } from '@/lib/db/entities/store.entity'
import { SubscriptionService } from '@/lib/services/subscription.service'

/**
 * Updates subscription status for all non-permanent stores
 * This should be run daily via cron job
 */
export async function updateAllSubscriptionStatuses() {
  try {
    const storeRepo = await getRepository(Store)

    // Find all stores that are not permanent
    const stores = await storeRepo.find({
      where: { isPermanent: false },
      select: ['id', 'name', 'subscriptionStatus', 'subscriptionEndDate'],
    })

    console.log(`[Cron] Starting subscription status update for ${stores.length} stores`)

    const results = {
      total: stores.length,
      updated: 0,
      errors: 0,
      statusChanges: [] as Array<{ storeId: string; storeName: string; oldStatus: string; newStatus: string }>,
    }

    // Process stores in batches of 50 to avoid overwhelming the database
    const batchSize = 50
    for (let i = 0; i < stores.length; i += batchSize) {
      const batch = stores.slice(i, i + batchSize)

      await Promise.all(
        batch.map(async (store) => {
          try {
            const oldStatus = store.subscriptionStatus
            const newStatus = await SubscriptionService.updateSubscriptionStatus(store.id)

            if (oldStatus !== newStatus) {
              results.statusChanges.push({
                storeId: store.id,
                storeName: store.name,
                oldStatus,
                newStatus,
              })
            }

            results.updated++
          } catch (error) {
            console.error(`[Cron] Failed to update store ${store.id}:`, error)
            results.errors++
          }
        })
      )
    }

    console.log(`[Cron] Subscription update complete:`, {
      total: results.total,
      updated: results.updated,
      errors: results.errors,
      changes: results.statusChanges.length,
    })

    if (results.statusChanges.length > 0) {
      console.log('[Cron] Status changes:', results.statusChanges)
    }

    return results
  } catch (error) {
    console.error('[Cron] Failed to update subscription statuses:', error)
    throw error
  }
}

/**
 * Gets summary of stores requiring attention
 */
export async function getSubscriptionAlerts() {
  try {
    const expiringStores = await SubscriptionService.getExpiringStores(7)
    const stats = await SubscriptionService.getSubscriptionStats()

    return {
      expiringCount: expiringStores.length,
      expiredCount: stats.expired,
      expiringStores: expiringStores.map(store => ({
        id: store.id,
        name: store.name,
        slug: store.slug,
        endDate: store.subscriptionEndDate,
        daysRemaining: SubscriptionService.calculateDaysRemaining(store.subscriptionEndDate),
      })),
    }
  } catch (error) {
    console.error('[Cron] Failed to get subscription alerts:', error)
    throw error
  }
}
