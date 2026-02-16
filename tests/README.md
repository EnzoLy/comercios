# Testing Guide - Commerce Management System

## 📋 Estructura de Tests

```
tests/
├── e2e/                    # Tests End-to-End con Playwright
│   ├── auth/              # Tests de autenticación
│   ├── pos/               # Tests de punto de venta (CRÍTICO)
│   ├── products/          # Tests de gestión de productos
│   ├── inventory/         # Tests de inventario
│   ├── shifts/            # Tests de turnos de caja
│   └── admin/             # Tests de administración
├── unit/                   # Tests Unitarios con Vitest
│   ├── lib/               # Tests de funciones de librería
│   ├── components/        # Tests de componentes React
│   └── validations/       # Tests de schemas Zod
├── helpers/                # Utilidades para tests
│   ├── auth.helper.ts     # Helpers de autenticación
│   ├── test-data.helper.ts # Datos de prueba
│   └── db.helper.ts       # Helpers de base de datos
└── setup.ts               # Configuración global de Vitest
```

## 🚀 Comandos Disponibles

### Tests Unitarios (Vitest)

```bash
# Ejecutar todos los unit tests
pnpm test:unit

# Ejecutar tests en modo watch (re-ejecuta al guardar cambios)
pnpm test:unit:watch

# Ejecutar tests con UI interactiva
pnpm test:unit:ui

# Generar reporte de cobertura
pnpm test:coverage
```

### Tests E2E (Playwright)

```bash
# Ejecutar todos los E2E tests (headless)
pnpm test:e2e

# Ejecutar con interfaz visual (UI Mode)
pnpm test:e2e:ui

# Ejecutar con navegador visible (headed mode)
pnpm test:e2e:headed

# Ejecutar en modo debug (paso a paso)
pnpm test:e2e:debug
```

### Todos los Tests

```bash
# Ejecutar unit tests + E2E tests
pnpm test:all
```

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env.test.local` basado en `.env.test`:

```env
# Base de datos de testing (¡IMPORTANTE: Usa una DB separada!)
DATABASE_URL=postgresql://user:password@localhost:5432/commerce_test

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=test-secret-key

# Usuarios de prueba
TEST_ADMIN_EMAIL=admin@test.com
TEST_ADMIN_PASSWORD=admin123
TEST_STORE_SLUG=test
```

### Base de Datos de Testing

**⚠️ IMPORTANTE:** Usa una base de datos SEPARADA para testing.

1. Crea una base de datos de testing:
```sql
CREATE DATABASE commerce_test;
```

2. Ejecuta las migraciones:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/commerce_test pnpm db:migrate
```

3. Crea usuario admin de prueba:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/commerce_test pnpm db:create-admin
```

## 📝 Escribiendo Tests

### Test E2E Ejemplo

```typescript
import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../helpers/auth.helper'

test.describe('Products Management', () => {
  test('should create a new product', async ({ page }) => {
    // Login
    await loginAsAdmin(page, 'test')

    // Navigate to products
    await page.goto('/dashboard/test/products')

    // Click "Add Product"
    await page.click('text=Agregar Producto')

    // Fill form
    await page.fill('input[name="name"]', 'Test Product')
    await page.fill('input[name="sku"]', 'TEST-001')
    await page.fill('input[name="costPrice"]', '10')
    await page.fill('input[name="sellingPrice"]', '15')

    // Submit
    await page.click('button[type="submit"]')

    // Verify success
    await expect(page.locator('text=Producto creado exitosamente')).toBeVisible()
  })
})
```

### Test Unitario Ejemplo

```typescript
import { describe, it, expect } from 'vitest'
import { createProductSchema } from '@/lib/validations/product.schema'

describe('Product Schema Validation', () => {
  it('should validate a valid product', () => {
    const validProduct = {
      name: 'Test Product',
      sku: 'TEST-001',
      costPrice: 10,
      sellingPrice: 15,
    }

    const result = createProductSchema.safeParse(validProduct)
    expect(result.success).toBe(true)
  })

  it('should reject product with invalid price', () => {
    const invalidProduct = {
      name: 'Test Product',
      sku: 'TEST-001',
      costPrice: -10,
      sellingPrice: 15,
    }

    const result = createProductSchema.safeParse(invalidProduct)
    expect(result.success).toBe(false)
  })
})
```

## 🎯 Best Practices

### Tests E2E

1. **Use selectores data-testid** cuando sea posible:
   ```typescript
   await page.click('[data-testid="add-product-btn"]')
   ```

2. **Limpia datos después de cada test**:
   ```typescript
   test.afterEach(async ({ page }) => {
     await cleanupTestProducts(authCookie, storeId)
   })
   ```

3. **Usa fixtures reutilizables**:
   ```typescript
   test.use({ storageState: 'tests/.auth/admin.json' })
   ```

### Tests Unitarios

1. **Tests independientes**: Cada test debe poder ejecutarse solo
2. **Mock de dependencias**: Usa mocks para APIs externas
3. **Describe claramente**: Usa nombres descriptivos
4. **Arrange-Act-Assert**: Estructura clara de setup, acción y verificación

## 🐛 Debugging

### Playwright

1. **Debug Mode**: Ejecuta con `--debug` para paso a paso
2. **Screenshots**: Se toman automáticamente en failures
3. **Videos**: Se graban en failures
4. **Traces**: Disponibles en `playwright-report/`

### Vitest

1. **Debug en VS Code**: Usa el debugger integrado
2. **Console.log**: Visible en output de tests
3. **UI Mode**: Interfaz visual para debugging

## 📊 CI/CD

Los tests se ejecutan automáticamente en CI:

```yaml
# .github/workflows/test.yml
- name: Run Unit Tests
  run: pnpm test:unit

- name: Run E2E Tests
  run: pnpm test:e2e
```

## 📚 Recursos

- [Playwright Docs](https://playwright.dev)
- [Vitest Docs](https://vitest.dev)
- [Testing Library](https://testing-library.com)
