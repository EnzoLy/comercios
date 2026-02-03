/**
 * Utilidades para manejar códigos de barras de productos por peso
 *
 * Prefijos 20-29: Productos por peso
 * Estos códigos NO identifican un producto único
 * Incluyen precio o peso en el código mismo
 */

export interface WeighedProductInfo {
  productId: string // Código base del producto (sin peso/precio)
  weight: number // Peso en la unidad del producto (kg, g, lb, etc.)
  price: number // Precio total calculado
  isValid: boolean
}

export interface BarcodeParseResult {
  isWeighedProduct: boolean
  productCode: string
  weight?: number
  price?: number
  isValid: boolean
}

/**
 * Verifica si un código de barras es de un producto por peso
 * Prefijos 20-29 indican productos por peso
 */
export function isWeighedProductBarcode(barcode: string): boolean {
  if (!barcode || barcode.length < 2) return false
  const prefix = parseInt(barcode.substring(0, 2))
  return prefix >= 20 && prefix <= 29
}

/**
 * Decodifica un código de barras de producto por peso
 *
 * Formato típico EAN-13 para productos por peso:
 * - Posición 0-1: Prefijo (20-29)
 * - Posición 2-6: Código del producto (5 dígitos)
 * - Posición 7-11: Precio o peso (5 dígitos)
 * - Posición 12: Dígito de verificación
 *
 * @param barcode - Código de barras escaneado
 * @param unitPrice - Precio por unidad (kg, lb) del producto
 * @returns Información decodificada del producto
 */
export function decodeWeighedProductBarcode(
  barcode: string,
  unitPrice: number
): WeighedProductInfo {
  // Remover espacios y caracteres no numéricos
  const cleanBarcode = barcode.replace(/\D/g, '')

  if (cleanBarcode.length < 7) {
    return {
      productId: '',
      weight: 0,
      price: 0,
      isValid: false,
    }
  }

  // Extraer el código base del producto (sin prefijo ni peso/precio)
  // Usualmente los primeros 7 caracteres: 2 + código de 5 dígitos
  const productCode = cleanBarcode.substring(0, 7)

  // Extraer el valor de peso/precio (generalmente 4-5 dígitos)
  // La posición puede variar según el país/sistema
  const weightOrPrice = parseInt(
    cleanBarcode.substring(7, Math.min(12, cleanBarcode.length - 1))
  )

  // Determinar si es peso o precio basado en el prefijo
  const prefix = parseInt(cleanBarcode.substring(0, 2))
  const isPriceBased = prefix === 22 || prefix === 23 // Usualmente estos prefijos son por precio

  let weight = 0
  let price = 0

  if (isPriceBased) {
    // El valor incluido es el precio total
    price = weightOrPrice / 100 // Convertir de centavos a dólares/euros
    weight = unitPrice > 0 ? price / unitPrice : 0
  } else {
    // El valor incluido es el peso (en gramos o la unidad del producto)
    // Asumimos gramos si el valor es grande (ej: 500g = 0.5kg)
    weight = weightOrPrice >= 1000 ? weightOrPrice / 1000 : weightOrPrice / 1000
    price = weight * unitPrice
  }

  return {
    productId: productCode,
    weight,
    price,
    isValid: weight > 0 && price > 0,
  }
}

/**
 * Genera un código de barras para un producto por peso
 *
 * @param productCode - Código base del producto
 * @param weight - Peso del producto
 * @param usePrice - Si es true, incluye el precio en lugar del peso
 * @returns Código de barras generado
 */
export function generateWeighedProductBarcode(
  productCode: string,
  weight: number,
  usePrice = false
): string {
  // Asegurarse de que el código base tenga 5 dígitos
  const baseCode = productCode.padStart(5, '0').substring(0, 5)

  // Convertir peso/precio a entero (2 decimales)
  const value = Math.round(weight * 100)

  // Generar código: prefijo(2) + código(5) + valor(5) + checksum(1)
  const prefix = '20' // Prefijo estándar para productos por peso
  const valueStr = value.toString().padStart(5, '0')

  const barcodeWithoutChecksum = `${prefix}${baseCode}${valueStr}`

  // Calcular dígito de verificación (EAN-13)
  const checksum = calculateEAN13Checksum(barcodeWithoutChecksum)

  return `${barcodeWithoutChecksum}${checksum}`
}

/**
 * Calcula el dígito de verificación EAN-13
 */
function calculateEAN13Checksum(code: string): string {
  if (code.length !== 12) return '0'

  let sum = 0
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i])
    // Posiciones impares se multiplican por 1, pares por 3
    sum += i % 2 === 0 ? digit : digit * 3
  }

  const remainder = sum % 10
  return remainder === 0 ? '0' : String(10 - remainder)
}

/**
 * Busca un producto por sus códigos de barras alternativos
 * Útil cuando un producto tiene múltiples códigos de barras
 */
export async function findProductByAnyBarcode(
  barcode: string,
  storeId: string,
  productRepo: any
): Promise<Product | null> {
  // Primero buscar por código principal
  const product = await productRepo.findOne({
    where: { storeId, barcode },
    relations: ['barcodes'],
  })

  if (product) {
    return product
  }

  // Si no se encuentra, buscar en códigos alternativos
  const barcodeEntity = await productRepo
    .createQueryBuilder('pb')
    .innerJoinAndSelect('pb.product', 'product')
    .where('pb.barcode = :barcode', { barcode })
    .andWhere('pb.isActive = :isActive', { isActive: true })
    .andWhere('product.storeId = :storeId', { storeId })
    .getOne()

  return barcodeEntity?.product || null
}

interface Product {
  id: string
  storeId: string
  barcode?: string
  isWeighedProduct: boolean
  sellingPrice: number
  weightUnit?: string
}
