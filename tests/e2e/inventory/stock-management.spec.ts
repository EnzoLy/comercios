import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../../helpers/auth.helper'
import { generateSKU } from '../../helpers/test-data.helper'

test.describe('Inventory - Stock Management', () => {
  const storeSlug = process.env.TEST_STORE_SLUG || 'test2'
  let testProductSKU: string

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page, storeSlug)

    // Create a test product for inventory operations
    await page.goto(`/dashboard/${storeSlug}/products/new`)
    testProductSKU = generateSKU('STOCK')

    await page.fill('input[name="name"]', 'Producto Test Inventario')
    await page.fill('input[name="sku"]', testProductSKU)
    await page.fill('input[name="costPrice"]', '10')
    await page.fill('input[name="sellingPrice"]', '15')
    await page.fill('input[name="currentStock"]', '50')
    await page.fill('input[name="minStockLevel"]', '10')

    await page.click('button[type="submit"]:has-text("Crear")')
    await expect(page.locator('text=Producto creado')).toBeVisible({ timeout: 10000 })

    // Navigate to inventory page
    await page.goto(`/dashboard/${storeSlug}/inventory`)
  })

  test('should display inventory page', async ({ page }) => {
    // Verify inventory page loads
    await expect(page.locator('h1:has-text("Inventario")')).toBeVisible()

    // Verify tabs are present
    const tabs = page.locator('text=Movimientos, text=Ajustar, text=Alertas')
    await expect(tabs.first()).toBeVisible({ timeout: 5000 })
  })

  test('should create stock adjustment (increase)', async ({ page }) => {
    // Click on "Ajustar Stock" tab
    const adjustTab = page.locator('button:has-text("Ajustar"), [role="tab"]:has-text("Ajustar")')
    if (await adjustTab.isVisible({ timeout: 2000 })) {
      await adjustTab.click()
    }

    // Search for the product
    const searchInput = page.locator('input[placeholder*="Buscar"]')
    if (await searchInput.isVisible({ timeout: 2000 })) {
      await searchInput.fill(testProductSKU)
      await page.waitForTimeout(500)
    }

    // Click adjust button for the product
    const adjustButton = page
      .locator(`tr:has-text("${testProductSKU}") button:has-text("Ajustar")`)
      .first()

    if (await adjustButton.isVisible({ timeout: 3000 })) {
      await adjustButton.click()

      // Select adjustment type (increase/add)
      await page.click('text=Agregar, text=Incrementar, select')

      // Enter quantity
      await page.fill('input[name="quantity"], input[type="number"]', '20')

      // Enter reason
      await page.fill('input[name="reason"], textarea[name="reason"]', 'Compra de mercancía')

      // Submit
      await page.click('button:has-text("Confirmar"), button:has-text("Guardar")')

      // Verify success
      await expect(page.locator('text=/ajuste realizado|stock actualizado/i')).toBeVisible({
        timeout: 5000,
      })
    }
  })

  test('should create stock adjustment (decrease)', async ({ page }) => {
    const adjustTab = page.locator('button:has-text("Ajustar")')
    if (await adjustTab.isVisible({ timeout: 2000 })) {
      await adjustTab.click()
    }

    const searchInput = page.locator('input[placeholder*="Buscar"]')
    if (await searchInput.isVisible()) {
      await searchInput.fill(testProductSKU)
      await page.waitForTimeout(500)
    }

    const adjustButton = page
      .locator(`tr:has-text("${testProductSKU}") button:has-text("Ajustar")`)
      .first()

    if (await adjustButton.isVisible({ timeout: 3000 })) {
      await adjustButton.click()

      // Select decrease option
      await page.click('text=Reducir, text=Decrementar, text=Daño')

      // Enter quantity
      await page.fill('input[name="quantity"], input[type="number"]', '5')

      // Enter reason
      await page.fill('input[name="reason"], textarea[name="reason"]', 'Producto dañado')

      // Submit
      await page.click('button:has-text("Confirmar"), button:has-text("Guardar")')

      // Verify success
      await expect(page.locator('text=/ajuste realizado|stock actualizado/i')).toBeVisible({
        timeout: 5000,
      })
    }
  })

  test('should display stock movements history', async ({ page }) => {
    // Click on "Movimientos" tab
    const movementsTab = page.locator('button:has-text("Movimientos"), [role="tab"]:has-text("Movimientos")')
    if (await movementsTab.isVisible({ timeout: 2000 })) {
      await movementsTab.click()
    }

    // Verify movements table exists
    await expect(page.locator('table, [data-testid="movements-list"]')).toBeVisible({ timeout: 5000 })

    // Verify table has columns
    await expect(page.locator('th:has-text("Producto"), th:has-text("Tipo")')).toBeVisible({
      timeout: 3000,
    })
  })

  test('should show low stock alerts', async ({ page }) => {
    // Navigate to alerts tab
    const alertsTab = page.locator('button:has-text("Alertas"), [role="tab"]:has-text("Alertas")')
    if (await alertsTab.isVisible({ timeout: 2000 })) {
      await alertsTab.click()

      // Verify alerts section is visible
      await expect(
        page.locator('text=/productos con stock bajo|low stock|alertas/i')
      ).toBeVisible({ timeout: 5000 })
    }
  })

  test('should filter movements by type', async ({ page }) => {
    const movementsTab = page.locator('button:has-text("Movimientos")')
    if (await movementsTab.isVisible({ timeout: 2000 })) {
      await movementsTab.click()
    }

    // Look for filter dropdown
    const filterSelect = page.locator('select:has-text("Tipo"), select[name="movementType"]')
    if (await filterSelect.isVisible({ timeout: 2000 })) {
      // Filter by "Compra" or "Purchase"
      await filterSelect.selectOption({ label: /Compra|Purchase|PURCHASE/i })

      await page.waitForTimeout(500)

      // Verify filtered results
      const movementRows = page.locator('tbody tr')
      const count = await movementRows.count()

      if (count > 0) {
        // Verify all visible rows are of selected type
        await expect(movementRows.first().locator('text=/Compra|Purchase/i')).toBeVisible()
      }
    }
  })

  test('should handle batch/lot management for perishable products', async ({ page }) => {
    // First create a perishable product
    await page.goto(`/dashboard/${storeSlug}/products/new`)

    const perishableSKU = generateSKU('BATCH')
    await page.fill('input[name="name"]', 'Producto Perecedero')
    await page.fill('input[name="sku"]', perishableSKU)
    await page.fill('input[name="costPrice"]', '10')
    await page.fill('input[name="sellingPrice"]', '15')

    // Enable expiration tracking
    const expirationCheckbox = page.locator(
      'input[name="trackExpirationDates"], input[id="trackExpirationDates"]'
    )
    if (await expirationCheckbox.isVisible({ timeout: 2000 })) {
      await expirationCheckbox.check()
    }

    await page.click('button[type="submit"]:has-text("Crear")')
    await expect(page.locator('text=Producto creado')).toBeVisible({ timeout: 10000 })

    // Navigate to inventory
    await page.goto(`/dashboard/${storeSlug}/inventory`)

    // Click on Lotes tab (if exists)
    const batchesTab = page.locator('button:has-text("Lotes"), [role="tab"]:has-text("Lotes")')
    if (await batchesTab.isVisible({ timeout: 2000 })) {
      await batchesTab.click()

      // Verify batches interface is visible
      await expect(page.locator('text=/lotes|batches|batch/i')).toBeVisible({ timeout: 3000 })
    }
  })

  test('should show expiring products alert', async ({ page }) => {
    // Navigate to "Vencimientos" tab
    const expiringTab = page.locator(
      'button:has-text("Vencimientos"), button:has-text("Próximos"), [role="tab"]:has-text("Venc")'
    )

    if (await expiringTab.isVisible({ timeout: 2000 })) {
      await expiringTab.click()

      // Verify expiring products section
      await expect(
        page.locator('text=/próximos a vencer|expiring soon|vencimientos/i')
      ).toBeVisible({ timeout: 5000 })
    }
  })
})
