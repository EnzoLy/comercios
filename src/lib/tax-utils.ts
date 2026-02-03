/**
 * Tax calculation utilities
 */

export interface TaxCalculation {
  subtotal: number
  taxAmount: number
  total: number
  taxRate: number
}

/**
 * Calculate tax amount for a given price and tax rate
 * @param price The base price (before tax)
 * @param taxRate The tax rate as a percentage (e.g., 15 for 15%)
 * @returns Tax calculation breakdown
 */
export function calculateTax(price: number, taxRate: number): TaxCalculation {
  const subtotal = price
  const taxAmount = (price * taxRate) / 100
  const total = price + taxAmount

  return {
    subtotal,
    taxAmount,
    total,
    taxRate,
  }
}

/**
 * Calculate tax for multiple items (e.g., cart items with different tax rates)
 * @param items Array of items with quantity, price, and tax rate
 * @returns Total tax calculation
 */
export function calculateCartTax(
  items: Array<{
    quantity: number
    price: number
    taxRate: number
  }>
): TaxCalculation {
  let totalSubtotal = 0
  let totalTaxAmount = 0

  items.forEach((item) => {
    const itemSubtotal = item.price * item.quantity
    const itemTax = (itemSubtotal * item.taxRate) / 100

    totalSubtotal += itemSubtotal
    totalTaxAmount += itemTax
  })

  return {
    subtotal: totalSubtotal,
    taxAmount: totalTaxAmount,
    total: totalSubtotal + totalTaxAmount,
    taxRate: totalSubtotal > 0 ? (totalTaxAmount / totalSubtotal) * 100 : 0,
  }
}

/**
 * Format tax amount for display
 * @param taxAmount The tax amount
 * @param currency The currency symbol
 * @returns Formatted string
 */
export function formatTaxAmount(taxAmount: number, currency: string = '$'): string {
  return `${currency}${taxAmount.toFixed(2)}`
}

/**
 * Format tax rate for display
 * @param taxRate The tax rate as a percentage
 * @returns Formatted string
 */
export function formatTaxRate(taxRate: number): string {
  return `${taxRate.toFixed(2)}%`
}
