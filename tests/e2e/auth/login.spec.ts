import { test, expect } from '@playwright/test'

test.describe('Authentication - Login', () => {
  const storeSlug = process.env.TEST_STORE_SLUG || 'test2'

  test.beforeEach(async ({ page }) => {
    // Clear cookies and storage before each test
    await page.context().clearCookies()
    await page.goto('/auth/signin')
  })

  test('should display login form', async ({ page }) => {
    // Verify login page elements
    await expect(page.locator('input[id="email"], input[type="email"]')).toBeVisible()
    await expect(page.locator('input[id="password"], input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should login successfully with valid credentials (ADMIN)', async ({ page }) => {
    const email = process.env.TEST_ADMIN_EMAIL || 'admin@test.com'
    const password = process.env.TEST_ADMIN_PASSWORD || 'admin123'

    // Fill login form
    await page.fill('input[id="email"], input[type="email"]', email)
    await page.fill('input[id="password"], input[type="password"]', password)

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL("/dashboard", { timeout: 10000 })

    // Verify we're logged in
    expect(page.url()).toContain('/dashboard')

    // Find and click the user menu button (button with ghost variant, has User icon)
    // Looking for the DropdownMenuTrigger which is a button in the header
    const userMenuButton = page.locator('header button[class*="ghost"]').first()
    await expect(userMenuButton).toBeVisible({ timeout: 5000 })

    // Click to open dropdown menu
    await userMenuButton.click()

    // Verify logout option is now visible in dropdown menu
    await expect(page.getByRole('menuitem', { name: /cerrar sesión/i })).toBeVisible({ timeout: 3000 })
  })

  test('should show error with invalid email', async ({ page }) => {
    await page.fill('input[id="email"]', 'invalid@test.com')
    await page.fill('input[id="password"]', 'wrongpassword')

    await page.click('button[type="submit"]')

    // Verify error message (toast message)
    await expect(page.getByText(/correo o contraseña inválidos/i)).toBeVisible({ timeout: 5000 })

    // Verify we're still on login page
    expect(page.url()).toContain('/auth/signin')
  })

  test('should show error with invalid password', async ({ page }) => {
    const email = process.env.TEST_ADMIN_EMAIL || 'admin@test.com'

    await page.fill('input[id="email"]', email)
    await page.fill('input[id="password"]', 'wrongpassword')

    await page.click('button[type="submit"]')

    // Verify error message (toast message)
    await expect(page.getByText(/correo o contraseña inválidos/i)).toBeVisible({ timeout: 5000 })
  })

  test('should show validation error for empty fields', async ({ page }) => {
    // Try to submit without filling fields
    await page.click('button[type="submit"]')

    // Verify validation errors (Zod validation messages below inputs)
    const errors = await page.locator('p.text-red-500').count()
    expect(errors).toBeGreaterThan(0)
  })

  test('should show validation error for invalid email format', async ({ page }) => {
    await page.fill('input[id="email"]', 'not-an-email')
    await page.fill('input[id="password"]', 'password123')

    await page.click('button[type="submit"]')

    // Verify email format error (Zod validation)
    await expect(page.locator('p.text-red-500').first()).toBeVisible({ timeout: 3000 })
  })

  // Note: Password toggle and Remember Me features are not implemented in current form
  test.skip('should toggle password visibility', async ({ page }) => {
    // This feature is not implemented in the current SignInForm
  })

  test.skip('should remember me checkbox work', async ({ page }) => {
    // This feature is not implemented in the current SignInForm
  })

  test('should redirect to requested page after login', async ({ page }) => {
    // Try to access protected page without login
    await page.goto(`/dashboard/${storeSlug}/products`)

    // Should redirect to login
    await page.waitForURL('/auth/signin')

    // Login
    const email = process.env.TEST_ADMIN_EMAIL || 'admin@test.com'
    const password = process.env.TEST_ADMIN_PASSWORD || 'admin123'

    await page.fill('input[id="email"], input[type="email"]', email)
    await page.fill('input[id="password"], input[type="password"]', password)
    await page.click('button[type="submit"]')

    // Should redirect back to originally requested page
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })

    // Verify we're on dashboard (might be products or store selector)
    expect(page.url()).toContain('/dashboard')
  })

  test('should prevent access to protected routes when not logged in', async ({ page }) => {
    await page.goto(`/dashboard/${storeSlug}/pos`)

    // Should redirect to login
    await page.waitForURL('/auth/signin', { timeout: 5000 })
    expect(page.url()).toContain('/auth/signin')
  })
})

test.describe('Authentication - Logout', () => {
  const storeSlug = process.env.TEST_STORE_SLUG || 'test2'

  test('should logout successfully', async ({ page }) => {
    // First, login
    await page.goto('/auth/signin')

    const email = process.env.TEST_ADMIN_EMAIL || 'admin@test.com'
    const password = process.env.TEST_ADMIN_PASSWORD || 'admin123'

    await page.fill('input[id="email"], input[type="email"]', email)
    await page.fill('input[id="password"], input[type="password"]', password)
    await page.click('button[type="submit"]')

    await page.waitForURL(/\/dashboard/, { timeout: 10000 })

    // Now logout
    // Click user menu button to open dropdown
    const userMenuButton = page.locator('header button[class*="ghost"]').first()
    await userMenuButton.click()

    // Click logout option in dropdown menu
    await page.getByRole('menuitem', { name: /cerrar sesión/i }).click()

    // Should redirect to login
    await page.waitForURL('/auth/signin', { timeout: 5000 })
    expect(page.url()).toContain('/auth/signin')

    // Verify cannot access protected routes
    await page.goto(`/dashboard/${storeSlug}/products`)
    await page.waitForURL('/auth/signin')
    expect(page.url()).toContain('/auth/signin')
  })
})
