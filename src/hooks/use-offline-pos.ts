'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  createSale: (saleData: any) => Promise<{ success: boolean; saleId?: string; queued?: boolean; invoiceUrl?: string }>
  syncNow: () => Promise<void>
  refreshCache: () => Promise<void>
  isCacheValid: boolean
  isLoadingCache: boolean
  cacheProductCount: number
}

/**
 * Hook for offline POS functionality.
 * Handles product caching in IndexedDB, sale creation (online/offline),
 * and automatic synchronization when connectivity is restored.
 */
export function useOfflinePOS(storeId: string): UseOfflinePOSResult {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [cachedProducts, setCachedProducts] = useState<CachedProduct[]>([])
  const [isCacheValid, setIsCacheValid] = useState(false)
  const [isLoadingCache, setIsLoadingCache] = useState(true)
  const [cacheProductCount, setCacheProductCount] = useState(0)
  const initializedRef = useRef(false)

  // Load initial data from IndexedDB
  useEffect(() => {
    if (!storeId || initializedRef.current) return
    initializedRef.current = true

    async function init() {
      setIsOnline(offlineQueue.getStatus())
      setIsLoadingCache(true)

      try {
        const [pending, products, valid] = await Promise.all([
          offlineQueue.getPendingCount(),
          productsCache.getProducts(storeId),
          productsCache.isCacheValid(storeId),
        ])

        setPendingCount(pending)
        setCachedProducts(products)
        setIsCacheValid(valid)
        setCacheProductCount(products.length)
      } catch (error) {
        console.error('Error initializing offline POS:', error)
      } finally {
        setIsLoadingCache(false)
      }
    }

    init()
  }, [storeId])

  // Subscribe to queue updates and online/offline events
  useEffect(() => {
    const unsubscribe = offlineQueue.onSync(async () => {
      const count = await offlineQueue.getPendingCount()
      setPendingCount(count)
    })

    const handleOnline = () => {
      setIsOnline(true)
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
   * Fetch ALL products from server (handles pagination) and cache in IndexedDB
   */
  const refreshCache = useCallback(async () => {
    if (!storeId) return

    setIsLoadingCache(true)
    try {
      const allProducts: any[] = []
      let page = 1
      const pageSize = 100
      let hasMore = true

      while (hasMore) {
        const response = await fetch(
          `/api/stores/${storeId}/products?page=${page}&pageSize=${pageSize}&includeInactive=false`
        )
        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const data = await response.json()
        const products = data.products || data
        allProducts.push(...products)

        hasMore = data.hasMore === true
        page++
      }

      await productsCache.cacheProducts(storeId, allProducts)
      setCachedProducts(allProducts)
      setIsCacheValid(true)
      setCacheProductCount(allProducts.length)
    } catch (error) {
      console.error('Error refreshing cache:', error)
    } finally {
      setIsLoadingCache(false)
    }
  }, [storeId])

  /**
   * Create a sale (works both online and offline).
   * When offline, the sale is queued in IndexedDB and local inventory is decremented.
   * When back online, queued sales sync automatically.
   */
  const createSale = useCallback(async (saleData: any) => {
    try {
      const saleId = generateUUID()

      const saleWithId = {
        ...saleData,
        id: saleId,
        storeId,
        createdAt: new Date().toISOString(),
        status: 'COMPLETED',
      }

      if (isOnline) {
        try {
          const response = await fetch(`/api/stores/${storeId}/sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saleWithId),
          })

          if (response.ok) {
            const result = await response.json()

            // Update local cache stock
            for (const item of saleWithId.items || []) {
              await productsCache.decreaseStock(item.productId, item.quantity)
            }
            const products = await productsCache.getProducts(storeId)
            setCachedProducts(products)

            return { success: true, saleId: result.id, invoiceUrl: result.invoiceUrl }
          } else {
            throw new Error(`HTTP ${response.status}`)
          }
        } catch (error) {
          // Online request failed - queue it
          console.error('Online sale failed, queuing:', error)
          return await queueSale(saleWithId)
        }
      } else {
        return await queueSale(saleWithId)
      }
    } catch (error) {
      console.error('Error creating sale:', error)
      // Last resort: try to queue
      const saleId = generateUUID()
      const saleWithId = {
        ...saleData,
        id: saleId,
        storeId,
        createdAt: new Date().toISOString(),
        status: 'COMPLETED',
      }
      return await queueSale(saleWithId)
    }
  }, [isOnline, storeId])

  /**
   * Queue a sale for later sync
   */
  async function queueSale(saleWithId: any) {
    await offlineQueue.add({
      type: 'CREATE_SALE',
      endpoint: `/api/stores/${storeId}/sales`,
      method: 'POST',
      body: saleWithId,
    })

    // Update local inventory
    for (const item of saleWithId.items || []) {
      await productsCache.decreaseStock(item.productId, item.quantity)
    }

    const products = await productsCache.getProducts(storeId)
    setCachedProducts(products)

    const count = await offlineQueue.getPendingCount()
    setPendingCount(count)

    return { success: true, saleId: saleWithId.id, queued: true }
  }

  /**
   * Manually trigger sync
   */
  const syncNow = useCallback(async () => {
    await offlineQueue.processQueue()
    const count = await offlineQueue.getPendingCount()
    setPendingCount(count)
  }, [])

  return {
    isOnline,
    pendingCount,
    cachedProducts,
    createSale,
    syncNow,
    refreshCache,
    isCacheValid,
    isLoadingCache,
    cacheProductCount,
  }
}
