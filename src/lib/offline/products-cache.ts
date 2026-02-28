/**
 * Offline products cache using IndexedDB.
 * Stores products locally for offline POS functionality.
 * IndexedDB provides significantly more storage than localStorage (~5MB)
 * and handles large product catalogs without issues.
 */

import {
  clearAndPutProducts,
  getAllProducts,
  getProductById as idbGetProductById,
  updateProduct as idbUpdateProduct,
  decreaseProductStock,
  getProductsCacheMeta,
  clearProductsCache,
} from './indexed-db'

export interface CachedProduct {
  id: string
  storeId: string
  name: string
  description?: string
  sku: string
  barcode?: string
  costPrice: number
  sellingPrice: number
  currentStock: number
  isWeighedProduct: boolean
  weightUnit?: string
  unit?: string
  imageUrl?: string
  isActive: boolean
  trackStock: boolean
  taxRate?: number
  overrideTaxRate: boolean
  categoryId?: string
  supplierId?: string
  barcodes?: { id: string; barcode: string; type?: string; isPrimary?: boolean }[]
  _cachedAt: number
}

const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

class ProductsCacheManager {
  /**
   * Check if cache is valid (not expired) for a given store
   */
  async isCacheValid(storeId: string): Promise<boolean> {
    if (typeof window === 'undefined') return false

    try {
      const meta = await getProductsCacheMeta(storeId)
      if (!meta) return false

      const age = Date.now() - meta.timestamp
      return age < CACHE_DURATION
    } catch {
      return false
    }
  }

  /**
   * Get all cached products for a store
   */
  async getProducts(storeId: string): Promise<CachedProduct[]> {
    if (typeof window === 'undefined') return []

    try {
      return await getAllProducts(storeId)
    } catch (error) {
      console.error('Error reading products cache:', error)
      return []
    }
  }

  /**
   * Get a single product by ID
   */
  async getProductById(id: string): Promise<CachedProduct | null> {
    try {
      const product = await idbGetProductById(id)
      return product || null
    } catch {
      return null
    }
  }

  /**
   * Search products by barcode or SKU (only active products).
   * Also checks product.barcodes array for multi-barcode support.
   */
  async searchByBarcodeOrSKU(storeId: string, query: string): Promise<CachedProduct[]> {
    const products = await this.getProducts(storeId)
    const lowerQuery = query.toLowerCase()

    return products.filter(p =>
      p.isActive && (
        p.barcode === query ||
        p.sku === query ||
        p.barcode?.toLowerCase().includes(lowerQuery) ||
        p.sku?.toLowerCase().includes(lowerQuery) ||
        p.barcodes?.some(b => b.barcode === query || b.barcode?.toLowerCase().includes(lowerQuery))
      )
    )
  }

  /**
   * Search products by name (only active products)
   */
  async searchByName(storeId: string, query: string): Promise<CachedProduct[]> {
    const products = await this.getProducts(storeId)
    const lowerQuery = query.toLowerCase()

    return products.filter(p =>
      p.isActive && p.name.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Cache products from server into IndexedDB.
   * Clears existing products for the store and replaces with new data.
   */
  async cacheProducts(storeId: string, products: any[]): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      await clearAndPutProducts(storeId, products)
      console.log(`Cached ${products.length} products in IndexedDB for store ${storeId}`)
    } catch (error) {
      console.error('Error caching products:', error)
    }
  }

  /**
   * Update a single product in cache
   */
  async updateProduct(product: Partial<CachedProduct> & { id: string }): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      await idbUpdateProduct(product)
    } catch (error) {
      console.error('Error updating product cache:', error)
    }
  }

  /**
   * Decrease stock for a product (after offline sale)
   */
  async decreaseStock(productId: string, quantity: number): Promise<void> {
    try {
      await decreaseProductStock(productId, quantity)
    } catch (error) {
      console.error('Error decreasing stock:', error)
    }
  }

  /**
   * Clear cache for a specific store
   */
  async clearCache(storeId: string): Promise<void> {
    if (typeof window === 'undefined') return

    await clearProductsCache(storeId)
    console.log(`Products cache cleared for store ${storeId}`)
  }

  /**
   * Get cache info for debugging
   */
  async getCacheInfo(storeId: string): Promise<{
    isValid: boolean
    productCount: number
    age: number | null
  }> {
    const [isValid, products, meta] = await Promise.all([
      this.isCacheValid(storeId),
      this.getProducts(storeId),
      getProductsCacheMeta(storeId),
    ])

    return {
      isValid,
      productCount: products.length,
      age: meta ? Date.now() - meta.timestamp : null,
    }
  }
}

// Singleton instance
export const productsCache = new ProductsCacheManager()
