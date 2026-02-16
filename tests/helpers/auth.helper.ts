import { Page } from '@playwright/test'

export interface TestUser {
  email: string
  password: string
  role: 'ADMIN' | 'MANAGER' | 'STOCK_KEEPER' | 'CASHIER'
  storeSlug: string
}

/**
 * Login helper for E2E tests
 */
export async function login(page: Page, user: TestUser) {
  await page.goto('/auth/signin')

  await page.fill('input[name="email"]', user.email)
  await page.fill('input[name="password"]', user.password)

  await page.click('button[type="submit"]')

  // Wait for redirect after successful login
  await page.waitForURL(/\/dashboard/, { timeout: 10000 })
}

/**
 * Login as ADMIN user
 */
export async function loginAsAdmin(page: Page, storeSlug: string = 'test2') {
  await login(page, {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'admin123',
    role: 'ADMIN',
    storeSlug,
  })
}

/**
 * Login as CASHIER user
 */
export async function loginAsCashier(page: Page, storeSlug: string = 'test2') {
  await login(page, {
    email: process.env.TEST_CASHIER_EMAIL || 'cashier@test.com',
    password: process.env.TEST_CASHIER_PASSWORD || 'cashier123',
    role: 'CASHIER',
    storeSlug,
  })
}

/**
 * Logout helper
 */
export async function logout(page: Page) {
  // Click user menu
  await page.click('[data-testid="user-menu"]')

  // Click logout button
  await page.click('text=Cerrar Sesión')

  // Wait for redirect to signin
  await page.waitForURL('/auth/signin')
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.waitForURL(/\/dashboard/, { timeout: 2000 })
    return true
  } catch {
    return false
  }
}
