/**
 * IndexedDB wrapper for offline POS data storage.
 * Provides persistent storage for products and offline operation queue,
 * overcoming localStorage's ~5MB limit.
 */

const DB_NAME = 'comercios_offline'
const DB_VERSION = 1

const STORES = {
  PRODUCTS: 'products',
  QUEUE: 'queue',
  META: 'meta',
} as const

type StoreName = (typeof STORES)[keyof typeof STORES]

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Products store - keyed by product id
      if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
        const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' })
        productStore.createIndex('storeId', 'storeId', { unique: false })
        productStore.createIndex('sku', 'sku', { unique: false })
        productStore.createIndex('barcode', 'barcode', { unique: false })
        productStore.createIndex('isActive', 'isActive', { unique: false })
        productStore.createIndex('categoryId', 'categoryId', { unique: false })
      }

      // Offline queue store - keyed by operation id
      if (!db.objectStoreNames.contains(STORES.QUEUE)) {
        const queueStore = db.createObjectStore(STORES.QUEUE, { keyPath: 'id' })
        queueStore.createIndex('status', 'status', { unique: false })
        queueStore.createIndex('timestamp', 'timestamp', { unique: false })
      }

      // Metadata store - cache timestamps, version info, etc.
      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withTransaction<T>(
  storeName: StoreName | StoreName[],
  mode: IDBTransactionMode,
  callback: (tx: IDBTransaction) => Promise<T> | T
): Promise<T> {
  const db = await openDB()
  try {
    const storeNames = Array.isArray(storeName) ? storeName : [storeName]
    const tx = db.transaction(storeNames, mode)
    const result = await callback(tx)
    return result
  } finally {
    db.close()
  }
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ─── Products ───────────────────────────────────────────────────

export async function putProducts(products: any[]): Promise<void> {
  const db = await openDB()
  try {
    const tx = db.transaction(STORES.PRODUCTS, 'readwrite')
    const store = tx.objectStore(STORES.PRODUCTS)

    for (const product of products) {
      store.put({ ...product, _cachedAt: Date.now() })
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function clearAndPutProducts(storeId: string, products: any[]): Promise<void> {
  const db = await openDB()
  try {
    const tx = db.transaction([STORES.PRODUCTS, STORES.META], 'readwrite')
    const productStore = tx.objectStore(STORES.PRODUCTS)
    const metaStore = tx.objectStore(STORES.META)

    // Delete existing products for this store using index cursor
    const index = productStore.index('storeId')
    const range = IDBKeyRange.only(storeId)
    const cursorRequest = index.openCursor(range)

    await new Promise<void>((resolve, reject) => {
      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }
      cursorRequest.onerror = () => reject(cursorRequest.error)
    })

    // Insert new products
    for (const product of products) {
      productStore.put({ ...product, _cachedAt: Date.now() })
    }

    // Update cache timestamp
    metaStore.put({
      key: `products_cache_${storeId}`,
      timestamp: Date.now(),
      count: products.length,
    })

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function getAllProducts(storeId?: string): Promise<any[]> {
  return withTransaction(STORES.PRODUCTS, 'readonly', async (tx) => {
    const store = tx.objectStore(STORES.PRODUCTS)

    if (storeId) {
      const index = store.index('storeId')
      return requestToPromise(index.getAll(storeId))
    }

    return requestToPromise(store.getAll())
  })
}

export async function getProductById(id: string): Promise<any | undefined> {
  return withTransaction(STORES.PRODUCTS, 'readonly', async (tx) => {
    const store = tx.objectStore(STORES.PRODUCTS)
    return requestToPromise(store.get(id))
  })
}

export async function updateProduct(product: { id: string; [key: string]: any }): Promise<void> {
  const existing = await getProductById(product.id)
  if (!existing) return

  return withTransaction(STORES.PRODUCTS, 'readwrite', async (tx) => {
    const store = tx.objectStore(STORES.PRODUCTS)
    store.put({ ...existing, ...product, _cachedAt: Date.now() })
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  })
}

export async function decreaseProductStock(productId: string, quantity: number): Promise<void> {
  const product = await getProductById(productId)
  if (!product || !product.trackStock) return

  return withTransaction(STORES.PRODUCTS, 'readwrite', async (tx) => {
    const store = tx.objectStore(STORES.PRODUCTS)
    store.put({
      ...product,
      currentStock: Math.max(0, product.currentStock - quantity),
      _cachedAt: Date.now(),
    })
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  })
}

export async function getProductsCacheMeta(storeId: string): Promise<{ timestamp: number; count: number } | null> {
  return withTransaction(STORES.META, 'readonly', async (tx) => {
    const store = tx.objectStore(STORES.META)
    const result = await requestToPromise(store.get(`products_cache_${storeId}`))
    return result || null
  })
}

export async function clearProductsCache(storeId: string): Promise<void> {
  const db = await openDB()
  try {
    const tx = db.transaction([STORES.PRODUCTS, STORES.META], 'readwrite')
    const productStore = tx.objectStore(STORES.PRODUCTS)
    const metaStore = tx.objectStore(STORES.META)

    const index = productStore.index('storeId')
    const range = IDBKeyRange.only(storeId)
    const cursorRequest = index.openCursor(range)

    await new Promise<void>((resolve, reject) => {
      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }
      cursorRequest.onerror = () => reject(cursorRequest.error)
    })

    metaStore.delete(`products_cache_${storeId}`)

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

// ─── Queue ──────────────────────────────────────────────────────

export async function addQueueOperation(operation: any): Promise<void> {
  return withTransaction(STORES.QUEUE, 'readwrite', async (tx) => {
    const store = tx.objectStore(STORES.QUEUE)
    store.put(operation)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  })
}

export async function getQueueOperations(): Promise<any[]> {
  return withTransaction(STORES.QUEUE, 'readonly', async (tx) => {
    const store = tx.objectStore(STORES.QUEUE)
    return requestToPromise(store.getAll())
  })
}

export async function getQueueOperationsByStatus(status: string): Promise<any[]> {
  return withTransaction(STORES.QUEUE, 'readonly', async (tx) => {
    const store = tx.objectStore(STORES.QUEUE)
    const index = store.index('status')
    return requestToPromise(index.getAll(status))
  })
}

export async function updateQueueOperation(id: string, updates: Record<string, any>): Promise<void> {
  return withTransaction(STORES.QUEUE, 'readwrite', async (tx) => {
    const store = tx.objectStore(STORES.QUEUE)
    const existing = await requestToPromise(store.get(id))
    if (existing) {
      store.put({ ...existing, ...updates })
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  })
}

export async function removeQueueOperation(id: string): Promise<void> {
  return withTransaction(STORES.QUEUE, 'readwrite', async (tx) => {
    const store = tx.objectStore(STORES.QUEUE)
    store.delete(id)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  })
}

export async function clearQueueByStatus(status: string): Promise<void> {
  const operations = await getQueueOperationsByStatus(status)

  if (operations.length === 0) return

  return withTransaction(STORES.QUEUE, 'readwrite', async (tx) => {
    const store = tx.objectStore(STORES.QUEUE)
    for (const op of operations) {
      store.delete(op.id)
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  })
}

export async function clearAllQueue(): Promise<void> {
  return withTransaction(STORES.QUEUE, 'readwrite', async (tx) => {
    const store = tx.objectStore(STORES.QUEUE)
    store.clear()
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  })
}
