/**
 * Database Test Helpers
 * For setting up and cleaning test data
 */

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000'

interface CreateProductParams {
  storeId: string
  name: string
  sku: string
  costPrice: number
  sellingPrice: number
  currentStock?: number
  minStockLevel?: number
  barcode?: string
  categoryId?: string
  unit?: string
  isWeighedProduct?: boolean
  weightUnit?: string
  trackExpirationDates?: boolean
  overrideTaxRate?: boolean
  taxRate?: number
}

/**
 * Create a test product via API
 */
export async function createTestProduct(
  authCookie: string,
  params: CreateProductParams
): Promise<{ id: string }> {
  const response = await fetch(`${BASE_URL}/api/stores/${params.storeId}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: authCookie,
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error(`Failed to create product: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Delete a product via API
 */
export async function deleteTestProduct(
  authCookie: string,
  storeId: string,
  productId: string
): Promise<void> {
  await fetch(`${BASE_URL}/api/stores/${storeId}/products/${productId}`, {
    method: 'DELETE',
    headers: {
      Cookie: authCookie,
    },
  })
}

/**
 * Create a test category via API
 */
export async function createTestCategory(
  authCookie: string,
  storeId: string,
  data: { name: string; description?: string }
): Promise<{ id: string }> {
  const response = await fetch(`${BASE_URL}/api/stores/${storeId}/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: authCookie,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`Failed to create category: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get auth cookies from page context
 */
export async function getAuthCookies(page: any): Promise<string> {
  const cookies = await page.context().cookies()
  return cookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
}

/**
 * Clean up all test products (products with SKU starting with TEST-)
 */
export async function cleanupTestProducts(authCookie: string, storeId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/stores/${storeId}/products?page=1&pageSize=1000`, {
    headers: {
      Cookie: authCookie,
    },
  })

  if (!response.ok) return

  const data = await response.json()
  const testProducts = data.products?.filter((p: any) => p.sku.startsWith('TEST-')) || []

  for (const product of testProducts) {
    await deleteTestProduct(authCookie, storeId, product.id)
  }
}
