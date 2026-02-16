/**
 * Test Data Helpers
 * Provides sample data for E2E and unit tests
 */

export const testProducts = {
  simple: {
    name: 'Producto de Prueba',
    sku: 'TEST-001',
    costPrice: 10.0,
    sellingPrice: 15.0,
    currentStock: 100,
    minStockLevel: 10,
    unit: 'piezas',
  },
  withBarcode: {
    name: 'Coca Cola 2L',
    sku: 'COCA-2L-001',
    barcode: '7501234567890',
    costPrice: 20.0,
    sellingPrice: 30.0,
    currentStock: 50,
    minStockLevel: 10,
    unit: 'piezas',
  },
  weighted: {
    name: 'Manzana',
    sku: 'MANZANA-001',
    costPrice: 5.0,
    sellingPrice: 8.0,
    currentStock: 0,
    minStockLevel: 0,
    unit: 'kg',
    isWeighedProduct: true,
    weightUnit: 'kg',
  },
  withTax: {
    name: 'Producto con IVA',
    sku: 'IVA-001',
    costPrice: 100.0,
    sellingPrice: 150.0,
    currentStock: 25,
    overrideTaxRate: true,
    taxRate: 16.0,
  },
  perishable: {
    name: 'Leche',
    sku: 'LECHE-001',
    costPrice: 15.0,
    sellingPrice: 22.0,
    currentStock: 30,
    trackExpirationDates: true,
  },
}

export const testCategories = {
  bebidas: {
    name: 'Bebidas',
    description: 'Bebidas y refrescos',
  },
  alimentos: {
    name: 'Alimentos',
    description: 'Productos alimenticios',
  },
  limpieza: {
    name: 'Limpieza',
    description: 'Productos de limpieza',
  },
}

export const testSuppliers = {
  cocaCola: {
    name: 'Coca Cola México',
    contactName: 'Juan Pérez',
    email: 'contacto@cocacola.test',
    phone: '+52 55 1234 5678',
    address: 'Av. Insurgentes 123',
    city: 'CDMX',
    country: 'México',
  },
  bimbo: {
    name: 'Grupo Bimbo',
    contactName: 'María García',
    email: 'ventas@bimbo.test',
    phone: '+52 55 9876 5432',
  },
}

export const testEmployees = {
  cashier: {
    name: 'Cajero de Prueba',
    email: 'cashier@test.com',
    password: 'cashier123',
    role: 'CASHIER',
    pin: '1234',
  },
  stockKeeper: {
    name: 'Almacenista de Prueba',
    email: 'stock@test.com',
    password: 'stock123',
    role: 'STOCK_KEEPER',
    pin: '2345',
  },
  manager: {
    name: 'Manager de Prueba',
    email: 'manager@test.com',
    password: 'manager123',
    role: 'MANAGER',
    pin: '3456',
  },
}

/**
 * Generate random SKU
 */
export function generateSKU(prefix: string = 'TEST'): string {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')
  return `${prefix}-${timestamp}-${random}`
}

/**
 * Generate random barcode (EAN-13 format)
 */
export function generateBarcode(): string {
  const random = Math.floor(Math.random() * 10000000000000)
    .toString()
    .padStart(13, '0')
  return random
}

/**
 * Wait helper
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Format currency for assertions
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
}
