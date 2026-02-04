/**
 * Offline products cache using localStorage
 * Stores products locally for offline POS functionality
 */

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
  _cachedAt: number
}

class ProductsCacheManager {
  private readonly CACHE_KEY = 'offline_products_cache'
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours
  private readonly CACHE_VERSION_KEY = 'offline_products_version'
  private currentVersion: number = 1

  /**
   * Check if cache is valid (not expired)
   */
  isCacheValid(): boolean {
    if (typeof window === 'undefined') return false

    try {
      const cached = localStorage.getItem(this.CACHE_KEY)
      if (!cached) return false

      const data = JSON.parse(cached)
      const age = Date.now() - data.timestamp

      return age < this.CACHE_DURATION
    } catch {
      return false
    }
  }

  /**
   * Get all cached products
   */
  getProducts(): CachedProduct[] {
    if (typeof window === 'undefined') return []

    try {
      const cached = localStorage.getItem(this.CACHE_KEY)
      if (!cached) return []

      const data = JSON.parse(cached)
      return data.products || []
    } catch (error) {
      console.error('Error reading products cache:', error)
      return []
    }
  }

  /**
   * Get a single product by ID
   */
  getProductById(id: string): CachedProduct | null {
    const products = this.getProducts()
    return products.find(p => p.id === id) || null
  }

  /**
   * Search products by barcode or SKU
   */
  searchByBarcodeOrSKU(query: string): CachedProduct[] {
    const products = this.getProducts()
    const lowerQuery = query.toLowerCase()

    return products.filter(p =>
      p.barcode === query ||
      p.sku === query ||
      p.barcode?.toLowerCase().includes(lowerQuery) ||
      p.sku?.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Search products by name
   */
  searchByName(query: string): CachedProduct[] {
    const products = this.getProducts()
    const lowerQuery = query.toLowerCase()

    return products.filter(p =>
      p.name.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Cache products from server
   */
  async cacheProducts(products: any[]): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      const data = {
        version: this.currentVersion,
        timestamp: Date.now(),
        products: products.map(p => ({
          ...p,
          _cachedAt: Date.now(),
        })),
      }

      localStorage.setItem(this.CACHE_KEY, JSON.stringify(data))
      console.log(`Cached ${products.length} products for offline use`)
    } catch (error) {
      console.error('Error caching products:', error)

      // If localStorage is full, try to clear old cache first
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.clearCache()
        // Retry once
        try {
          const data = {
            version: this.currentVersion,
            timestamp: Date.now(),
            products: products.map(p => ({
              ...p,
              _cachedAt: Date.now(),
            })),
          }
          localStorage.setItem(this.CACHE_KEY, JSON.stringify(data))
        } catch (retryError) {
          console.error('Still failed to cache products:', retryError)
        }
      }
    }
  }

  /**
   * Update a single product in cache
   */
  updateProduct(product: Partial<CachedProduct> & { id: string }): void {
    if (typeof window === 'undefined') return

    try {
      const cached = localStorage.getItem(this.CACHE_KEY)
      if (!cached) return

      const data = JSON.parse(cached)
      const index = data.products.findIndex((p: CachedProduct) => p.id === product.id)

      if (index !== -1) {
        data.products[index] = {
          ...data.products[index],
          ...product,
          _cachedAt: Date.now(),
        }

        localStorage.setItem(this.CACHE_KEY, JSON.stringify(data))
      }
    } catch (error) {
      console.error('Error updating product cache:', error)
    }
  }

  /**
   * Decrease stock for a product (after offline sale)
   */
  decreaseStock(productId: string, quantity: number): void {
    const product = this.getProductById(productId)
    if (product && product.trackStock) {
      this.updateProduct({
        id: productId,
        currentStock: Math.max(0, product.currentStock - quantity),
      })
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    if (typeof window === 'undefined') return

    localStorage.removeItem(this.CACHE_KEY)
    console.log('Products cache cleared')
  }

  /**
   * Get cache size estimate
   */
  getCacheSize(): number {
    if (typeof window === 'undefined') return 0

    try {
      const cached = localStorage.getItem(this.CACHE_KEY)
      return cached ? new Blob([cached]).size : 0
    } catch {
      return 0
    }
  }

  /**
   * Get cache info for debugging
   */
  getCacheInfo(): {
    isValid: boolean
    productCount: number
    size: number
    age: number | null
  } {
    const products = this.getProducts()
    const size = this.getCacheSize()

    let age: number | null = null
    try {
      const cached = localStorage.getItem(this.CACHE_KEY)
      if (cached) {
        const data = JSON.parse(cached)
        age = Date.now() - data.timestamp
      }
    } catch {}

    return {
      isValid: this.isCacheValid(),
      productCount: products.length,
      size,
      age,
    }
  }
}

// Singleton instance
export const productsCache = new ProductsCacheManager()
