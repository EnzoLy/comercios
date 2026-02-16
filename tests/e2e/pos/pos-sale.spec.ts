import { test, expect, Page } from '@playwright/test'
import { loginAsAdmin } from '../../helpers/auth.helper'
import { testProducts, generateSKU, formatCurrency } from '../../helpers/test-data.helper'
import { createTestProduct, getAuthCookies, cleanupTestProducts } from '../../helpers/db.helper'

test.describe('POS - Point of Sale (Critical Flow)', () => {
  const storeSlug = process.env.TEST_STORE_SLUG || 'test2'
  const storeId = process.env.TEST_STORE_ID || ''

  let authCookie: string
  let testProductId: string

  test.beforeAll(async ({ browser }) => {
    // Setup: Create test product
    const page = await browser.newPage()
    await loginAsAdmin(page, storeSlug)
    authCookie = await getAuthCookies(page)

    // Create a product for testing
    const product = await createTestProduct(authCookie, {
      storeId,
      ...testProducts.withBarcode,
      sku: generateSKU('POS'),
    })
    testProductId = product.id

    await page.close()
  })

  test.afterAll(async () => {
    // Cleanup test products
    if (authCookie && storeId) {
      await cleanupTestProducts(authCookie, storeId)
    }
  })

  test('should complete a simple sale with barcode', async ({ page }) => {
    // Login as admin (only owners/admins can login with email/password)
    await loginAsAdmin(page, storeSlug)

    // Navigate to POS
    await page.goto(`/dashboard/${storeSlug}/pos`)

    // Wait for POS to load
    await expect(page.locator('h1:has-text("Punto de Venta")')).toBeVisible()

    // Search product by barcode
    const barcodeInput = page.locator('input[placeholder*="código de barras"]')
    await barcodeInput.fill(testProducts.withBarcode.barcode!)
    await barcodeInput.press('Enter')

    // Wait for product to be added to cart
    await page.waitForTimeout(500)

    // Verify product appears in cart
    await expect(page.locator(`text=${testProducts.withBarcode.name}`)).toBeVisible()

    // Verify price is correct
    const sellingPrice = testProducts.withBarcode.sellingPrice
    await expect(page.locator(`text=${formatCurrency(sellingPrice)}`)).toBeVisible()

    // Click "Procesar Venta" or "Completar Venta"
    const completeButton = page.locator('button:has-text("Completar"), button:has-text("Procesar")')
    await completeButton.click()

    // Payment method modal should appear
    await expect(page.locator('text=Método de Pago')).toBeVisible({ timeout: 5000 })

    // Select "Efectivo" (Cash)
    await page.click('text=Efectivo')

    // Enter payment amount (exact amount)
    const paymentInput = page.locator('input[type="number"]').first()
    await paymentInput.fill(sellingPrice.toString())

    // Confirm payment
    await page.click('button:has-text("Confirmar"), button:has-text("Procesar Pago")')

    // Verify success message
    await expect(page.locator('text=Venta realizada')).toBeVisible({ timeout: 10000 })

    // Verify we're back to empty POS
    await expect(page.locator('text=Carrito vacío')).toBeVisible({ timeout: 5000 })
  })

  test('should add multiple products to cart', async ({ page }) => {
    await loginAsAdmin(page, storeSlug)
    await page.goto(`/dashboard/${storeSlug}/pos`)

    // Add product twice
    const barcodeInput = page.locator('input[placeholder*="código de barras"]')

    await barcodeInput.fill(testProducts.withBarcode.barcode!)
    await barcodeInput.press('Enter')
    await page.waitForTimeout(300)

    await barcodeInput.fill(testProducts.withBarcode.barcode!)
    await barcodeInput.press('Enter')
    await page.waitForTimeout(300)

    // Verify quantity is 2
    await expect(page.locator('text=×2')).toBeVisible()

    // Verify total is price * 2
    const expectedTotal = testProducts.withBarcode.sellingPrice * 2
    await expect(page.locator(`text=${formatCurrency(expectedTotal)}`)).toBeVisible()
  })

  test('should calculate change correctly', async ({ page }) => {
    await loginAsAdmin(page, storeSlug)
    await page.goto(`/dashboard/${storeSlug}/pos`)

    // Add product
    const barcodeInput = page.locator('input[placeholder*="código de barras"]')
    await barcodeInput.fill(testProducts.withBarcode.barcode!)
    await barcodeInput.press('Enter')
    await page.waitForTimeout(500)

    // Complete sale
    const completeButton = page.locator('button:has-text("Completar"), button:has-text("Procesar")')
    await completeButton.click()

    // Select cash payment
    await page.click('text=Efectivo')

    // Pay with more than required (e.g., $50 for a $30 product)
    const sellingPrice = testProducts.withBarcode.sellingPrice
    const paymentAmount = 50
    const expectedChange = paymentAmount - sellingPrice

    const paymentInput = page.locator('input[type="number"]').first()
    await paymentInput.fill(paymentAmount.toString())

    // Verify change is displayed
    await expect(page.locator(`text=${formatCurrency(expectedChange)}`)).toBeVisible()

    // Confirm payment
    await page.click('button:has-text("Confirmar"), button:has-text("Procesar Pago")')

    // Verify success
    await expect(page.locator('text=Venta realizada')).toBeVisible({ timeout: 10000 })
  })

  test('should apply discount to sale', async ({ page }) => {
    await loginAsAdmin(page, storeSlug)
    await page.goto(`/dashboard/${storeSlug}/pos`)

    // Add product
    const barcodeInput = page.locator('input[placeholder*="código de barras"]')
    await barcodeInput.fill(testProducts.withBarcode.barcode!)
    await barcodeInput.press('Enter')
    await page.waitForTimeout(500)

    // Click discount button (if exists)
    const discountButton = page.locator('button:has-text("Descuento"), [data-testid="discount-btn"]')

    if (await discountButton.isVisible({ timeout: 2000 })) {
      await discountButton.click()

      // Apply 10% discount
      const discountInput = page.locator('input[placeholder*="descuento"]')
      await discountInput.fill('10')

      // Confirm discount
      await page.click('button:has-text("Aplicar")')

      // Verify discounted price
      const originalPrice = testProducts.withBarcode.sellingPrice
      const discountedPrice = originalPrice * 0.9
      await expect(page.locator(`text=${formatCurrency(discountedPrice)}`)).toBeVisible()
    }
  })

  test('should remove product from cart', async ({ page }) => {
    await loginAsAdmin(page, storeSlug)
    await page.goto(`/dashboard/${storeSlug}/pos`)

    // Add product
    const barcodeInput = page.locator('input[placeholder*="código de barras"]')
    await barcodeInput.fill(testProducts.withBarcode.barcode!)
    await barcodeInput.press('Enter')
    await page.waitForTimeout(500)

    // Verify product is in cart
    await expect(page.locator(`text=${testProducts.withBarcode.name}`)).toBeVisible()

    // Click remove button (X or trash icon)
    const removeButton = page.locator('[data-testid="remove-item"], button:has-text("Eliminar")').first()
    await removeButton.click()

    // Verify cart is empty
    await expect(page.locator('text=Carrito vacío')).toBeVisible()
  })

  test('should handle product not found', async ({ page }) => {
    await loginAsAdmin(page, storeSlug)
    await page.goto(`/dashboard/${storeSlug}/pos`)

    // Try to search for non-existent barcode
    const barcodeInput = page.locator('input[placeholder*="código de barras"]')
    await barcodeInput.fill('9999999999999')
    await barcodeInput.press('Enter')

    // Verify error message
    await expect(page.locator('text=Producto no encontrado')).toBeVisible({ timeout: 3000 })
  })
})
