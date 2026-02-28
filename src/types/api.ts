/**
 * API request/response types and contracts
 */

/**
 * Paginated products response
 */
export interface ProductsResponse {
  products: any[] // Use Product type from domain.ts at import site
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * API error response
 */
export interface ApiError {
  error: string
  details?: unknown
  status?: number
}

/**
 * API success response
 */
export interface ApiSuccess<T> {
  success: true
  data: T
  message?: string
}
