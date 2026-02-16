import { describe, it, expect } from 'vitest'
import { createProductSchema } from '@/lib/validations/product.schema'

describe('Product Schema Validation', () => {
  describe('Valid Products', () => {
    it('should validate a minimal valid product', () => {
      const validProduct = {
        name: 'Test Product',
        sku: 'TEST-001',
        costPrice: 10,
        sellingPrice: 15,
      }

      const result = createProductSchema.safeParse(validProduct)
      expect(result.success).toBe(true)
    })

    it('should validate product with all optional fields', () => {
      const fullProduct = {
        name: 'Complete Product',
        sku: 'COMP-001',
        costPrice: 10,
        sellingPrice: 15,
        description: 'A complete product',
        barcode: '1234567890123',
        currentStock: 100,
        minStockLevel: 10,
        maxStockLevel: 500,
        unit: 'piezas',
        imageUrl: 'https://example.com/image.jpg',
        trackStock: true,
        trackExpirationDates: false,
        isActive: true,
      }

      const result = createProductSchema.safeParse(fullProduct)
      expect(result.success).toBe(true)
    })

    it('should validate weighted product', () => {
      const weightedProduct = {
        name: 'Manzanas',
        sku: 'MANZ-001',
        costPrice: 5,
        sellingPrice: 8,
        isWeighedProduct: true,
        weightUnit: 'kg',
      }

      const result = createProductSchema.safeParse(weightedProduct)
      expect(result.success).toBe(true)
    })

    it('should validate product with custom tax rate', () => {
      const taxProduct = {
        name: 'Product with Tax',
        sku: 'TAX-001',
        costPrice: 100,
        sellingPrice: 150,
        overrideTaxRate: true,
        taxRate: 16,
      }

      const result = createProductSchema.safeParse(taxProduct)
      expect(result.success).toBe(true)
    })
  })

  describe('Invalid Products', () => {
    it('should reject product without name', () => {
      const invalidProduct = {
        sku: 'TEST-001',
        costPrice: 10,
        sellingPrice: 15,
      }

      const result = createProductSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name')
      }
    })

    it('should reject product without SKU', () => {
      const invalidProduct = {
        name: 'Test Product',
        costPrice: 10,
        sellingPrice: 15,
      }

      const result = createProductSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('sku')
      }
    })

    it('should reject product with negative cost price', () => {
      const invalidProduct = {
        name: 'Test Product',
        sku: 'TEST-001',
        costPrice: -10,
        sellingPrice: 15,
      }

      const result = createProductSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('costPrice')
      }
    })

    it('should reject product with negative selling price', () => {
      const invalidProduct = {
        name: 'Test Product',
        sku: 'TEST-001',
        costPrice: 10,
        sellingPrice: -15,
      }

      const result = createProductSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('sellingPrice')
      }
    })

    it('should reject product with negative stock', () => {
      const invalidProduct = {
        name: 'Test Product',
        sku: 'TEST-001',
        costPrice: 10,
        sellingPrice: 15,
        currentStock: -5,
      }

      const result = createProductSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('currentStock')
      }
    })

    it('should reject product with max stock less than min stock', () => {
      const invalidProduct = {
        name: 'Test Product',
        sku: 'TEST-001',
        costPrice: 10,
        sellingPrice: 15,
        minStockLevel: 100,
        maxStockLevel: 50, // Less than min!
      }

      const result = createProductSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
    })

    it('should reject product with invalid image URL', () => {
      const invalidProduct = {
        name: 'Test Product',
        sku: 'TEST-001',
        costPrice: 10,
        sellingPrice: 15,
        imageUrl: 'not-a-valid-url',
      }

      const result = createProductSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('imageUrl')
      }
    })

    it('should reject product with tax rate > 100', () => {
      const invalidProduct = {
        name: 'Test Product',
        sku: 'TEST-001',
        costPrice: 10,
        sellingPrice: 15,
        overrideTaxRate: true,
        taxRate: 150,
      }

      const result = createProductSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('taxRate')
      }
    })

    it('should reject product with negative tax rate', () => {
      const invalidProduct = {
        name: 'Test Product',
        sku: 'TEST-001',
        costPrice: 10,
        sellingPrice: 15,
        overrideTaxRate: true,
        taxRate: -5,
      }

      const result = createProductSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('taxRate')
      }
    })

    it('should reject product with name too short', () => {
      const invalidProduct = {
        name: 'A', // Only 1 character, min is 2
        sku: 'TEST-001',
        costPrice: 10,
        sellingPrice: 15,
      }

      const result = createProductSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name')
      }
    })
  })

  describe('Default Values', () => {
    it('should apply default values for optional fields', () => {
      const product = {
        name: 'Test Product',
        sku: 'TEST-001',
        costPrice: 10,
        sellingPrice: 15,
      }

      const result = createProductSchema.safeParse(product)
      expect(result.success).toBe(true)

      if (result.success) {
        expect(result.data.currentStock).toBe(0)
        expect(result.data.minStockLevel).toBe(10)
        expect(result.data.trackStock).toBe(true)
        expect(result.data.trackExpirationDates).toBe(false)
        expect(result.data.isActive).toBe(true)
        expect(result.data.isWeighedProduct).toBe(false)
        expect(result.data.overrideTaxRate).toBe(false)
      }
    })
  })
})
