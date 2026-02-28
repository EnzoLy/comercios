/**
 * Domain types for products, services, and quotes
 * These are UI/client-side representations, not database entities
 */

/**
 * Product type used throughout the application
 * Represents a sellable product item with pricing, stock, and expiration tracking
 */
export interface Product {
  id: string
  name: string
  sku: string
  barcode?: string
  sellingPrice: number | string
  costPrice: number | string
  currentStock: number
  minStockLevel?: number
  maxStockLevel?: number
  isActive?: boolean
  trackStock?: boolean
  trackExpirationDates?: boolean
  imageUrl?: string
  category?: { id: string; name: string }
  supplier?: { id: string; name: string }
  barcodes?: Array<{ id: string; barcode: string; type?: string; isPrimary?: boolean }>
  categoryId?: string
  itemType?: 'product'
  expirationStatus?: {
    hasExpired: boolean
    hasExpiringSoon: boolean
    nearestExpirationDays: number
    nearestExpirationDate: string
  }
}

/**
 * Service type for service-based business operations
 * Represents a service offering with pricing and duration
 */
export interface Service {
  id: string
  name: string
  description?: string
  price: number | string
  duration?: number
  category?: { name: string }
  categoryId?: string | null
  isActive?: boolean
  imageUrl?: string
  createdAt?: string
  itemType: 'service'
}

/**
 * Quote item representing a single line in a quote
 * Can be either a product or a service
 */
export interface QuoteItem {
  id?: string
  itemType: string
  productId?: string | null
  serviceId?: string | null
  name: string
  quantity: number
  unitPrice: number
  discount: number
  taxRate: number
  taxAmount?: number
  total?: number
}

/**
 * Quote data structure for quote management
 * Contains quote details, items, and client information
 */
export interface Quote {
  id: string
  quoteNumber: string
  clientName: string
  clientPhone?: string | null
  notes?: string | null
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  subtotal?: number
  tax?: number
  discount?: number
  total: number
  createdAt: string
  accessToken: string
  items: QuoteItem[]
  store: {
    id: string
    name: string
    email?: string
    phone?: string
    address?: string
  }
}

/**
 * Sale item data for transaction processing and refunds
 */
export interface SaleItemData {
  id: string
  productId: string | null
  productName: string
  productSku?: string | null
  quantity: number
  unitPrice: number
  alreadyReturned: number
}

/**
 * Search result union type for product/service searches
 */
export type SearchResult = Product | Service
