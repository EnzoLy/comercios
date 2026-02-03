/**
 * Formatea un número al formato de peso colombiano
 * @param amount - El monto a formatear (number o string)
 * @param options - Opciones de formateo
 * @returns String formateado en formato colombiano (ej: $1.000.000,00)
 *
 * @example
 * formatCurrency(1000000) // "$1.000.000,00"
 * formatCurrency(1500.5) // "$1.500,50"
 * formatCurrency(0) // "$0,00"
 */
export function formatCurrency(
  amount: number | string,
  options: {
    decimals?: number
    showSymbol?: boolean
    locale?: string
  } = {}
): string {
  const {
    decimals = 2,
    showSymbol = true,
    locale = 'es-CO', // Colombiano por defecto
  } = options

  // Convertir a número si viene como string
  const numAmount = typeof amount === 'number' ? amount : parseFloat(amount || '0')

  // Verificar si es un número válido
  if (isNaN(numAmount)) {
    return showSymbol ? '$0,00' : '0,00'
  }

  // Formatear usando Intl.NumberFormat
  const formatter = new Intl.NumberFormat(locale, {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'COP',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return formatter.format(numAmount)
}

/**
 * Formatea un precio sin símbolo de moneda
 * @example
 * formatPrice(1000000) // "1.000.000,00"
 */
export function formatPrice(amount: number | string, decimals = 2): string {
  return formatCurrency(amount, { showSymbol: false, decimals })
}

/**
 * Formatea un precio corto (sin centavos para montos grandes)
 * @example
 * formatPriceShort(1000000) // "$1.000.000"
 */
export function formatPriceShort(amount: number | string): string {
  return formatCurrency(amount, { decimals: 0 })
}

/**
 * Parsea un string formateado de vuelta a número
 * @example
 * parseCurrency("$1.000.000,00") // 1000000
 */
export function parseCurrency(formatted: string): number {
  // Eliminar símbolo de moneda y espacios, luego reemplazar puntos por nada y comas por puntos
  const cleaned = formatted
    .replace(/[$\s]/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
  return parseFloat(cleaned) || 0
}
