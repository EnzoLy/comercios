import { describe, it, expect } from 'vitest'
import { calculateTax, calculateCartTax, formatTaxAmount, formatTaxRate } from '@/lib/tax-utils'

describe('Tax Utilities', () => {
  describe('calculateTax', () => {
    it('should calculate tax correctly for 16% rate', () => {
      const result = calculateTax(100, 16)

      expect(result.subtotal).toBe(100)
      expect(result.taxAmount).toBe(16)
      expect(result.total).toBe(116)
      expect(result.taxRate).toBe(16)
    })

    it('should calculate tax correctly for 8% rate', () => {
      const result = calculateTax(100, 8)

      expect(result.subtotal).toBe(100)
      expect(result.taxAmount).toBe(8)
      expect(result.total).toBe(108)
      expect(result.taxRate).toBe(8)
    })

    it('should handle 0% tax rate', () => {
      const result = calculateTax(100, 0)

      expect(result.subtotal).toBe(100)
      expect(result.taxAmount).toBe(0)
      expect(result.total).toBe(100)
      expect(result.taxRate).toBe(0)
    })

    it('should handle decimal prices', () => {
      const result = calculateTax(99.99, 16)

      expect(result.subtotal).toBe(99.99)
      expect(result.taxAmount).toBeCloseTo(15.9984, 4)
      expect(result.total).toBeCloseTo(115.9884, 4)
    })

    it('should handle large prices', () => {
      const result = calculateTax(10000, 16)

      expect(result.subtotal).toBe(10000)
      expect(result.taxAmount).toBe(1600)
      expect(result.total).toBe(11600)
    })

    it('should calculate tax for small amounts', () => {
      const result = calculateTax(1.50, 16)

      expect(result.subtotal).toBe(1.50)
      expect(result.taxAmount).toBe(0.24)
      expect(result.total).toBe(1.74)
    })
  })

  describe('calculateCartTax', () => {
    it('should calculate tax for cart with single item', () => {
      const items = [{ quantity: 2, price: 50, taxRate: 16 }]

      const result = calculateCartTax(items)

      expect(result.subtotal).toBe(100) // 2 * 50
      expect(result.taxAmount).toBe(16) // 100 * 0.16
      expect(result.total).toBe(116)
      expect(result.taxRate).toBe(16)
    })

    it('should calculate tax for cart with multiple items same tax rate', () => {
      const items = [
        { quantity: 2, price: 50, taxRate: 16 },
        { quantity: 1, price: 30, taxRate: 16 },
      ]

      const result = calculateCartTax(items)

      expect(result.subtotal).toBe(130) // (2*50) + (1*30)
      expect(result.taxAmount).toBe(20.8) // 130 * 0.16
      expect(result.total).toBe(150.8)
      expect(result.taxRate).toBe(16)
    })

    it('should calculate tax for cart with items with different tax rates', () => {
      const items = [
        { quantity: 1, price: 100, taxRate: 16 }, // Subtotal: 100, Tax: 16
        { quantity: 1, price: 100, taxRate: 8 }, // Subtotal: 100, Tax: 8
      ]

      const result = calculateCartTax(items)

      expect(result.subtotal).toBe(200)
      expect(result.taxAmount).toBe(24) // 16 + 8
      expect(result.total).toBe(224)
      expect(result.taxRate).toBe(12) // Average: (24/200) * 100
    })

    it('should handle cart with zero tax items', () => {
      const items = [
        { quantity: 1, price: 100, taxRate: 16 },
        { quantity: 1, price: 50, taxRate: 0 }, // Exempt product
      ]

      const result = calculateCartTax(items)

      expect(result.subtotal).toBe(150)
      expect(result.taxAmount).toBe(16)
      expect(result.total).toBe(166)
      expect(result.taxRate).toBeCloseTo(10.67, 2) // (16/150) * 100
    })

    it('should handle empty cart', () => {
      const items: Array<{ quantity: number; price: number; taxRate: number }> = []

      const result = calculateCartTax(items)

      expect(result.subtotal).toBe(0)
      expect(result.taxAmount).toBe(0)
      expect(result.total).toBe(0)
      expect(result.taxRate).toBe(0)
    })

    it('should handle cart with multiple quantities', () => {
      const items = [
        { quantity: 5, price: 20, taxRate: 16 }, // Subtotal: 100
        { quantity: 3, price: 15, taxRate: 16 }, // Subtotal: 45
      ]

      const result = calculateCartTax(items)

      expect(result.subtotal).toBe(145)
      expect(result.taxAmount).toBe(23.2) // 145 * 0.16
      expect(result.total).toBe(168.2)
    })

    it('should calculate correctly with decimal quantities (weighted products)', () => {
      const items = [
        { quantity: 1.5, price: 10, taxRate: 16 }, // Subtotal: 15
        { quantity: 2.75, price: 8, taxRate: 16 }, // Subtotal: 22
      ]

      const result = calculateCartTax(items)

      expect(result.subtotal).toBe(37)
      expect(result.taxAmount).toBe(5.92)
      expect(result.total).toBe(42.92)
    })
  })

  describe('formatTaxAmount', () => {
    it('should format tax amount with default currency', () => {
      const formatted = formatTaxAmount(16.5)
      expect(formatted).toBe('$16.50')
    })

    it('should format tax amount with custom currency', () => {
      const formatted = formatTaxAmount(16.5, '€')
      expect(formatted).toBe('€16.50')
    })

    it('should format zero tax', () => {
      const formatted = formatTaxAmount(0)
      expect(formatted).toBe('$0.00')
    })

    it('should format large amounts', () => {
      const formatted = formatTaxAmount(1234.56)
      expect(formatted).toBe('$1234.56')
    })

    it('should round to 2 decimal places', () => {
      const formatted = formatTaxAmount(16.666)
      expect(formatted).toBe('$16.67')
    })

    it('should handle negative amounts (refunds)', () => {
      const formatted = formatTaxAmount(-16.5)
      expect(formatted).toBe('$-16.50')
    })
  })

  describe('formatTaxRate', () => {
    it('should format tax rate as percentage', () => {
      const formatted = formatTaxRate(16)
      expect(formatted).toBe('16.00%')
    })

    it('should format decimal tax rates', () => {
      const formatted = formatTaxRate(16.5)
      expect(formatted).toBe('16.50%')
    })

    it('should format zero tax rate', () => {
      const formatted = formatTaxRate(0)
      expect(formatted).toBe('0.00%')
    })

    it('should round to 2 decimal places', () => {
      const formatted = formatTaxRate(16.666)
      expect(formatted).toBe('16.67%')
    })
  })

  describe('Real-world scenarios', () => {
    it('should calculate tax for typical Mexican IVA (16%)', () => {
      // Product costs $100, IVA is 16%
      const result = calculateTax(100, 16)

      expect(result.total).toBe(116)
      expect(result.taxAmount).toBe(16)
    })

    it('should calculate tax for reduced rate products (8%)', () => {
      // Some products have reduced IVA rate
      const result = calculateTax(100, 8)

      expect(result.total).toBe(108)
      expect(result.taxAmount).toBe(8)
    })

    it('should handle typical POS cart scenario', () => {
      const cartItems = [
        { quantity: 2, price: 25.50, taxRate: 16 }, // Coca Cola x2
        { quantity: 1, price: 15.00, taxRate: 16 }, // Chips
        { quantity: 3, price: 8.50, taxRate: 16 }, // Candy x3
      ]

      const result = calculateCartTax(cartItems)

      expect(result.subtotal).toBe(91.5) // 51 + 15 + 25.5
      expect(result.taxAmount).toBe(14.64) // 91.5 * 0.16
      expect(result.total).toBe(106.14)
    })

    it('should handle weighted products (fruits, meats)', () => {
      const items = [
        { quantity: 1.5, price: 15, taxRate: 0 }, // 1.5kg apples, exempt
        { quantity: 2.3, price: 45, taxRate: 0 }, // 2.3kg meat, exempt
      ]

      const result = calculateCartTax(items)

      // Use toBeCloseTo for decimal precision issues
      expect(result.subtotal).toBeCloseTo(126, 2)
      expect(result.taxAmount).toBe(0)
      expect(result.total).toBeCloseTo(126, 2)
    })
  })
})
