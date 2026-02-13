import { getRepository } from '@/lib/db'
import { Store } from '@/lib/db/entities/store.entity'
import { SubscriptionPayment } from '@/lib/db/entities/subscription-payment.entity'
import { RecordPaymentInput, RenewSubscriptionInput } from '@/lib/validations/subscription.schema'
import { LessThanOrEqual, MoreThanOrEqual, IsNull, Not } from 'typeorm'

export class SubscriptionService {
  /**
   * Updates the subscription status of a store based on current dates
   * @param storeId Store UUID
   * @returns Updated subscription status
   */
  static async updateSubscriptionStatus(storeId: string): Promise<string> {
    const storeRepo = await getRepository(Store)
    const store = await storeRepo.findOne({ where: { id: storeId } })

    if (!store) {
      throw new Error('Store not found')
    }

    // If permanent, status is always PERMANENT
    if (store.isPermanent) {
      if (store.subscriptionStatus !== 'PERMANENT') {
        store.subscriptionStatus = 'PERMANENT'
        await storeRepo.save(store)
      }
      return 'PERMANENT'
    }

    const now = new Date()
    let newStatus: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' = 'ACTIVE'

    // If no end date, consider it expired
    if (!store.subscriptionEndDate) {
      newStatus = 'EXPIRED'
    } else {
      const endDate = new Date(store.subscriptionEndDate)
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysRemaining < 0) {
        newStatus = 'EXPIRED'
      } else if (daysRemaining <= 7) {
        newStatus = 'EXPIRING_SOON'
      } else {
        newStatus = 'ACTIVE'
      }
    }

    // Update if status changed
    if (store.subscriptionStatus !== newStatus) {
      store.subscriptionStatus = newStatus
      await storeRepo.save(store)
    }

    return newStatus
  }

  /**
   * Records a manual subscription payment and updates the store's subscription
   * @param data Payment data
   * @param userId User recording the payment
   * @returns Created payment record
   */
  static async recordPayment(data: RecordPaymentInput, userId: string): Promise<SubscriptionPayment> {
    const storeRepo = await getRepository(Store)
    const paymentRepo = await getRepository(SubscriptionPayment)

    const store = await storeRepo.findOne({ where: { id: data.storeId } })
    if (!store) {
      throw new Error('Store not found')
    }

    const now = new Date()
    const paymentDate = new Date(data.paymentDate)

    // Calculate duration in months
    let totalMonths = 0
    const months = data.durationMonths ?? 0
    const years = data.durationYears ?? 0
    totalMonths = months + (years * 12)

    // Default to 1 month if not permanent and no duration provided
    if (!data.isPermanent && totalMonths === 0) {
      totalMonths = 1
    }

    // Calculate period start and end dates
    let periodStartDate: Date
    let periodEndDate: Date

    if (data.isPermanent) {
      // For permanent subscriptions, set a symbolic period
      periodStartDate = now
      periodEndDate = new Date(now)
      periodEndDate.setFullYear(periodEndDate.getFullYear() + 100) // 100 years in the future
      totalMonths = 1200 // 100 years
    } else {
      // Determine start date based on current subscription status
      const currentEndDate = store.subscriptionEndDate ? new Date(store.subscriptionEndDate) : null

      if (currentEndDate && currentEndDate > now) {
        // Extend from current end date
        periodStartDate = currentEndDate
      } else {
        // Start from today if expired or no subscription
        periodStartDate = now
      }

      // Calculate end date
      periodEndDate = new Date(periodStartDate)
      periodEndDate.setMonth(periodEndDate.getMonth() + totalMonths)
    }

    // Create payment record
    const payment = paymentRepo.create({
      storeId: data.storeId,
      amount: data.amount,
      currency: data.currency || 'USD',
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber,
      paymentDate,
      durationMonths: totalMonths,
      periodStartDate,
      periodEndDate,
      recordedByUserId: userId,
      notes: data.notes,
    })

    const savedPayment = await paymentRepo.save(payment)

    // Update store subscription
    store.isPermanent = data.isPermanent
    if (!data.isPermanent) {
      store.subscriptionEndDate = periodEndDate
      store.subscriptionStartDate = periodStartDate
      store.subscriptionStatus = 'ACTIVE'
    } else {
      store.subscriptionStatus = 'PERMANENT'
    }
    await storeRepo.save(store)

    return savedPayment as SubscriptionPayment
  }

  /**
   * Gets payment history for a store
   * @param storeId Store UUID
   * @returns Array of payment records
   */
  static async getPaymentHistory(storeId: string): Promise<SubscriptionPayment[]> {
    const paymentRepo = await getRepository(SubscriptionPayment)

    const payments = await paymentRepo.find({
      where: { storeId },
      relations: ['recordedBy'],
      order: { paymentDate: 'DESC' },
    })

    return payments as SubscriptionPayment[]
  }

  /**
   * Gets stores that are expiring within the specified number of days
   * @param days Number of days threshold
   * @returns Array of stores
   */
  static async getExpiringStores(days: number = 7): Promise<Store[]> {
    const storeRepo = await getRepository(Store)

    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)

    const stores = await storeRepo.find({
      where: [
        {
          isPermanent: false,
          subscriptionEndDate: LessThanOrEqual(futureDate),
          subscriptionStatus: Not('EXPIRED'),
        },
      ],
      order: { subscriptionEndDate: 'ASC' },
    })

    return stores as Store[]
  }

  /**
   * Gets subscription statistics
   * @param includeInactive Include inactive stores in stats
   * @returns Statistics object
   */
  static async getSubscriptionStats(includeInactive: boolean = false) {
    const storeRepo = await getRepository(Store)

    const whereClause = includeInactive ? {} : { isActive: true }

    const allStores = await storeRepo.find({ where: whereClause })

    const stats = {
      total: allStores.length,
      active: allStores.filter(s => s.subscriptionStatus === 'ACTIVE').length,
      expiringSoon: allStores.filter(s => s.subscriptionStatus === 'EXPIRING_SOON').length,
      expired: allStores.filter(s => s.subscriptionStatus === 'EXPIRED').length,
      permanent: allStores.filter(s => s.subscriptionStatus === 'PERMANENT').length,
    }

    return stats
  }

  /**
   * Checks if a store can be accessed based on subscription status
   * @param storeId Store UUID
   * @returns Access check result
   */
  static async checkStoreAccess(storeId: string): Promise<{ hasAccess: boolean; reason?: string }> {
    const storeRepo = await getRepository(Store)

    const store = await storeRepo.findOne({ where: { id: storeId } })

    if (!store) {
      return { hasAccess: false, reason: 'Store not found' }
    }

    if (!store.isActive) {
      return { hasAccess: false, reason: 'Store is inactive' }
    }

    // Update status first to ensure it's current
    await this.updateSubscriptionStatus(storeId)

    // Re-fetch to get updated status
    const updatedStore = await storeRepo.findOne({ where: { id: storeId } })

    if (!updatedStore) {
      return { hasAccess: false, reason: 'Store not found' }
    }

    if (updatedStore.subscriptionStatus === 'EXPIRED') {
      return {
        hasAccess: false,
        reason: 'Subscription expired. Please contact the administrator to renew.'
      }
    }

    return { hasAccess: true }
  }

  /**
   * Renews a store's subscription by extending the end date
   * @param data Renewal data
   * @returns Updated store
   */
  static async renewSubscription(data: RenewSubscriptionInput): Promise<Store> {
    const storeRepo = await getRepository(Store)

    const store = await storeRepo.findOne({ where: { id: data.storeId } })
    if (!store) {
      throw new Error('Store not found')
    }

    // Calculate duration in months
    let totalMonths = 0
    if (data.durationMonths) totalMonths += data.durationMonths
    if (data.durationYears) totalMonths += data.durationYears * 12

    const now = new Date()
    let newEndDate: Date

    // Determine start date for renewal
    const currentEndDate = store.subscriptionEndDate ? new Date(store.subscriptionEndDate) : null

    if (currentEndDate && currentEndDate > now) {
      // Extend from current end date
      newEndDate = new Date(currentEndDate)
    } else {
      // Start from today if expired
      newEndDate = new Date(now)
      if (!store.subscriptionStartDate) {
        store.subscriptionStartDate = now
      }
    }

    // Add the renewal period
    newEndDate.setMonth(newEndDate.getMonth() + totalMonths)

    store.subscriptionEndDate = newEndDate
    store.isPermanent = false

    await storeRepo.save(store)

    // Update status
    await this.updateSubscriptionStatus(store.id)

    return store as Store
  }

  /**
   * Toggles permanent subscription status for a store
   * @param storeId Store UUID
   * @param isPermanent Whether to make permanent or not
   * @returns Updated store
   */
  static async togglePermanent(storeId: string, isPermanent: boolean): Promise<Store> {
    const storeRepo = await getRepository(Store)

    const store = await storeRepo.findOne({ where: { id: storeId } })
    if (!store) {
      throw new Error('Store not found')
    }

    if (isPermanent) {
      store.subscriptionStatus = 'PERMANENT'
      store.subscriptionEndDate = null
    } else {
      store.subscriptionStatus = 'ACTIVE'
    }

    store.isPermanent = isPermanent
    store.updatedAt = new Date()

    await storeRepo.save(store)

    return store as Store
  }

  /**
   * Calculates days remaining until subscription expiration
   * @param endDate Subscription end date
   * @returns Days remaining (null if permanent or no end date)
   */
  static calculateDaysRemaining(endDate: Date | null | undefined): number | null {
    if (!endDate) return null

    const now = new Date()
    const end = new Date(endDate)
    const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return daysRemaining
  }
}
