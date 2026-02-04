'use client'

import { useState, useEffect, useCallback } from 'react'
import { offlineQueue } from '@/lib/offline/queue'
import { productsCache, type CachedProduct } from '@/lib/offline/products-cache'

// Generate UUID using crypto API (available in modern browsers and Node.js)
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export interface UseOfflinePOSResult {
  isOnline: boolean
  pendingCount: number
  cachedProducts: CachedProduct[]
  createSale: (saleData: any) => Promise<{ success: boolean; saleId?: string; queued?: boolean }>
  syncNow: () => Promise<void>
  refreshCache: () => Promise<void>
  isCacheValid: boolean
}

/**
 * Hook for offline POS functionality
 * Handles product caching, sale creation (online/offline), and synchronization
 */
export function useOfflinePOS(storeId: string): UseOfflinePOSResult {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [cachedProducts, setCachedProducts] = useState<CachedProduct[]>([])
  const [isCacheValid, setIsCacheValid] = useState(false)

  // Initialize and listen for status changes
  useEffect(() => {
    setIsOnline(offlineQueue.getStatus())
    setPendingCount(offlineQueue.getPendingCount())
    setCachedProducts(productsCache.getProducts())
    setIsCacheValid(productsCache.isCacheValid())

    // Subscribe to queue updates
    const unsubscribe = offlineQueue.onSync(() => {
      setPendingCount(offlineQueue.getPendingCount())
    })

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      // Auto-sync when coming back online
      setTimeout(() => offlineQueue.processQueue(), 1000)
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      unsubscribe()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  /**
   * Create a sale (works both online and offline)
   */
  const createSale = useCallback(async (saleData: any) => {
    try {
      // Generate sale ID client-side
      const saleId = generateUUID()

      // Prepare sale data
      const saleWithId = {
        ...saleData,
        id: saleId,
        storeId,
        createdAt: new Date().toISOString(),
        status: 'COMPLETED',
      }

      if (isOnline) {
        // Try to create sale online
        const response = await fetch(`/api/stores/${storeId}/sales`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(saleWithId),
        })

        if (response.ok) {
          const result = await response.json()
          return { success: true, saleId: result.id }
        } else {
          throw new Error(`HTTP ${response.status}`)
        }
      } else {
        // Offline - queue the sale
        await offlineQueue.add({
          type: 'CREATE_SALE',
          endpoint: `/api/stores/${storeId}/sales`,
          method: 'POST',
          body: saleWithId,
        })

        // Update local inventory
        saleWithId.items?.forEach((item: any) => {
          productsCache.decreaseStock(item.productId, item.quantity)
        })

        setCachedProducts(productsCache.getProducts())
        setPendingCount(offlineQueue.getPendingCount())

        return { success: true, saleId, queued: true }
      }
    } catch (error) {
      // If online request fails, queue it
      console.error('Error creating sale, queuing for later:', error)

      const saleId = generateUUID()
      const saleWithId = {
        ...saleData,
        id: saleId,
        storeId,
        createdAt: new Date().toISOString(),
        status: 'COMPLETED',
      }

      await offlineQueue.add({
        type: 'CREATE_SALE',
        endpoint: `/api/stores/${storeId}/sales`,
        method: 'POST',
        body: saleWithId,
      })

      // Update local inventory
      saleWithId.items?.forEach((item: any) => {
        productsCache.decreaseStock(item.productId, item.quantity)
      })

      setCachedProducts(productsCache.getProducts())
      setPendingCount(offlineQueue.getPendingCount())

      return { success: true, saleId, queued: true }
    }
  }, [isOnline, storeId])

  /**
   * Manually trigger sync
   */
  const syncNow = useCallback(async () => {
    await offlineQueue.processQueue()
    setPendingCount(offlineQueue.getPendingCount())
  }, [])

  /**
   * Refresh product cache from server
   */
  const refreshCache = useCallback(async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}/products`)
      if (response.ok) {
        const products = await response.json()
        await productsCache.cacheProducts(products)
        setCachedProducts(products)
        setIsCacheValid(true)
      }
    } catch (error) {
      console.error('Error refreshing cache:', error)
    }
  }, [storeId])

  return {
    isOnline,
    pendingCount,
    cachedProducts,
    createSale,
    syncNow,
    refreshCache,
    isCacheValid,
  }
}
