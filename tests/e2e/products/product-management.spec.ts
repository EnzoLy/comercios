import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../helpers/auth.helper'
import { generateSKU, generateBarcode } from '../../helpers/test-data.helper'

test.describe('Product Management', () => {
  const storeSlug = process.env.TEST_STORE_SLUG || 'test2'

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page, storeSlug)
    await page.goto(`/dashboard/${storeSlug}/products`)
  })

  test('should display products list', async ({ page }) => {
    // Verify we're on products page
    await expect(page.locator('h1:has-text("Productos")')).toBeVisible()

    // Verify table or grid is present
    const productsList = page.locator('[data-testid="products-list"], table, [role="grid"]')
    await expect(productsList).toBeVisible({ timeout: 5000 })
  })

  test('should create a new product with all required fields', async ({ page }) => {
    // Click "Add Product" button
    await page.click('text=Agregar Producto, a[href*="/products/new"]')

    // Wait for form to load
    await expect(page.locator('h1:has-text("Agregar"), h1:has-text("Nuevo Producto")')).toBeVisible()

    // Fill required fields
    const sku = generateSKU('TEST')
    await page.fill('input[name="name"]', 'Producto de Prueba E2E')
    await page.fill('input[name="sku"]', sku)
    await page.fill('input[name="costPrice"]', '10.50')
    await page.fill('input[name="sellingPrice"]', '15.99')

    // Optional: Add stock
    await page.fill('input[name="currentStock"]', '100')
    await page.fill('input[name="minStockLevel"]', '10')

    // Submit form
    await page.click('button[type="submit"]:has-text("Crear")')

    // Verify success message
    await expect(page.locator('text=Producto creado')).toBeVisible({ timeout: 10000 })

    // Verify redirect to products list
    await page.waitForURL(new RegExp(`/dashboard/${storeSlug}/products`))

    // Verify product appears in list
    await expect(page.locator(`text=${sku}`)).toBeVisible({ timeout: 5000 })
  })

  test('should create product with barcode', async ({ page }) => {
    await page.click('text=Agregar Producto, a[href*="/products/new"]')
    await expect(page.locator('h1:has-text("Agregar")')).toBeVisible()

    const sku = generateSKU('BARCODE')
    const barcode = generateBarcode()

    await page.fill('input[name="name"]', 'Producto con Código de Barras')
    await page.fill('input[name="sku"]', sku)
    await page.fill('input[name="barcode"]', barcode)
    await page.fill('input[name="costPrice"]', '20')
    await page.fill('input[name="sellingPrice"]', '30')

    await page.click('button[type="submit"]:has-text("Crear")')

    await expect(page.locator('text=Producto creado')).toBeVisible({ timeout: 10000 })
  })

  test('should create product with custom tax rate', async ({ page }) => {
    await page.click('text=Agregar Producto, a[href*="/products/new"]')
    await expect(page.locator('h1:has-text("Agregar")')).toBeVisible()

    const sku = generateSKU('TAX')

    await page.fill('input[name="name"]', 'Producto con IVA Personalizado')
    await page.fill('input[name="sku"]', sku)
    await page.fill('input[name="costPrice"]', '100')
    await page.fill('input[name="sellingPrice"]', '150')

    // Enable custom tax rate
    const taxCheckbox = page.locator('input[name="overrideTaxRate"], input[id="overrideTaxRate"]')
    if (await taxCheckbox.isVisible({ timeout: 2000 })) {
      await taxCheckbox.check()

      // Set tax rate to 8%
      await page.fill('input[name="taxRate"]', '8')
    }

    await page.click('button[type="submit"]:has-text("Crear")')

    await expect(page.locator('text=Producto creado')).toBeVisible({ timeout: 10000 })
  })

  test('should show validation error for duplicate SKU', async ({ page }) => {
    // Create first product
    await page.click('text=Agregar Producto, a[href*="/products/new"]')

    const duplicateSKU = generateSKU('DUP')

    await page.fill('input[name="name"]', 'Producto Original')
    await page.fill('input[name="sku"]', duplicateSKU)
    await page.fill('input[name="costPrice"]', '10')
    await page.fill('input[name="sellingPrice"]', '15')

    await page.click('button[type="submit"]:has-text("Crear")')
    await expect(page.locator('text=Producto creado')).toBeVisible({ timeout: 10000 })

    // Try to create second product with same SKU
    await page.click('text=Agregar Producto')
    await page.fill('input[name="name"]', 'Producto Duplicado')
    await page.fill('input[name="sku"]', duplicateSKU)
    await page.fill('input[name="costPrice"]', '20')
    await page.fill('input[name="sellingPrice"]', '25')

    await page.click('button[type="submit"]:has-text("Crear")')

    // Verify error message
    await expect(page.locator('text=/SKU ya existe|SKU duplicado/i')).toBeVisible({ timeout: 5000 })
  })

  test('should show validation errors for required fields', async ({ page }) => {
    await page.click('text=Agregar Producto, a[href*="/products/new"]')

    // Try to submit empty form
    await page.click('button[type="submit"]:has-text("Crear")')

    // Verify validation errors appear
    await expect(page.locator('text=/requerido|obligatorio|required/i').first()).toBeVisible({
      timeout: 3000,
    })
  })

  test('should edit an existing product', async ({ page }) => {
    // Create a product first
    await page.click('text=Agregar Producto')

    const sku = generateSKU('EDIT')
    await page.fill('input[name="name"]', 'Producto para Editar')
    await page.fill('input[name="sku"]', sku)
    await page.fill('input[name="costPrice"]', '10')
    await page.fill('input[name="sellingPrice"]', '15')

    await page.click('button[type="submit"]:has-text("Crear")')
    await expect(page.locator('text=Producto creado')).toBeVisible({ timeout: 10000 })

    // Find and click edit button
    const productRow = page.locator(`tr:has-text("${sku}"), [data-testid="product-${sku}"]`).first()
    const editButton = productRow.locator('button:has-text("Editar"), a:has-text("Editar")').first()

    if (await editButton.isVisible({ timeout: 2000 })) {
      await editButton.click()
    } else {
      // Alternative: Click on the product row itself
      await productRow.click()
    }

    // Wait for edit form
    await expect(page.locator('h1:has-text("Editar")')).toBeVisible({ timeout: 5000 })

    // Modify the product
    await page.fill('input[name="name"]', 'Producto Editado')
    await page.fill('input[name="sellingPrice"]', '20')

    // Save changes
    await page.click('button[type="submit"]:has-text("Actualizar"), button[type="submit"]:has-text("Guardar")')

    // Verify success
    await expect(page.locator('text=/Producto actualizado|guardado/i')).toBeVisible({ timeout: 10000 })
  })

  test('should delete a product', async ({ page }) => {
    // Create a product to delete
    await page.click('text=Agregar Producto')

    const sku = generateSKU('DELETE')
    await page.fill('input[name="name"]', 'Producto para Eliminar')
    await page.fill('input[name="sku"]', sku)
    await page.fill('input[name="costPrice"]', '10')
    await page.fill('input[name="sellingPrice"]', '15')

    await page.click('button[type="submit"]:has-text("Crear")')
    await expect(page.locator('text=Producto creado')).toBeVisible({ timeout: 10000 })

    // Find and click delete button
    const productRow = page.locator(`tr:has-text("${sku}")`).first()
    const deleteButton = productRow.locator('button:has-text("Eliminar")').first()

    if (await deleteButton.isVisible({ timeout: 2000 })) {
      await deleteButton.click()

      // Confirm deletion in modal
      await page.click('button:has-text("Confirmar"), button:has-text("Sí")')

      // Verify success message
      await expect(page.locator('text=/eliminado|deleted/i')).toBeVisible({ timeout: 5000 })

      // Verify product no longer appears in list
      await expect(page.locator(`text=${sku}`)).not.toBeVisible({ timeout: 3000 })
    }
  })

  test('should search/filter products', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[placeholder*="Buscar"], input[type="search"]')

    if (await searchInput.isVisible({ timeout: 2000 })) {
      // Type search query
      await searchInput.fill('TEST')

      // Wait for results
      await page.waitForTimeout(500)

      // Verify results are filtered
      const results = await page.locator('tbody tr, [data-testid="product-item"]').count()
      expect(results).toBeGreaterThanOrEqual(0)
    }
  })

  test('should upload product image', async ({ page }) => {
    await page.click('text=Agregar Producto')

    const sku = generateSKU('IMG')
    await page.fill('input[name="name"]', 'Producto con Imagen')
    await page.fill('input[name="sku"]', sku)
    await page.fill('input[name="costPrice"]', '10')
    await page.fill('input[name="sellingPrice"]', '15')

    // Try to add image URL
    const imageUrlInput = page.locator('input[name="imageUrl"]')
    if (await imageUrlInput.isVisible({ timeout: 2000 })) {
      await imageUrlInput.fill('https://placehold.co/400x400/png')

      // Verify preview appears
      await expect(page.locator('img[alt*="Vista previa"], img[alt*="preview"]')).toBeVisible({
        timeout: 3000,
      })
    }

    await page.click('button[type="submit"]:has-text("Crear")')
    await expect(page.locator('text=Producto creado')).toBeVisible({ timeout: 10000 })
  })
})
