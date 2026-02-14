import { getDataSource } from '@/lib/db'
import { Product } from '@/lib/db/entities/product.entity'
import { Category } from '@/lib/db/entities/category.entity'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { ProductBarcode } from '@/lib/db/entities/product-barcode.entity'

export interface ImportResult {
  products: {
    created: number
    updated: number
    errors: { row: number; message: string }[]
  }
  categories: {
    created: number
    errors: { row: number; message: string }[]
  }
  suppliers: {
    created: number
    errors: { row: number; message: string }[]
  }
}

export interface ImportOptions {
  updateExisting?: boolean
  createCategories?: boolean
  createSuppliers?: boolean
}

function parseNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0
  const num = Number(String(value).replace(/[^0-9.-]/g, ''))
  return isNaN(num) ? 0 : num
}

function parseString(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined
  return String(value).trim() || undefined
}

async function findOrCreateCategory(
  storeId: string,
  categoryName: string,
  createIfMissing: boolean
): Promise<string | undefined> {
  const dataSource = await getDataSource()
  const categoryRepo = dataSource.getRepository(Category)

  const normalizedName = categoryName.trim().toLowerCase()

  let category = await categoryRepo
    .createQueryBuilder('category')
    .where('category.storeId = :storeId', { storeId })
    .andWhere('LOWER(category.name) = :name', { name: normalizedName })
    .getOne()

  if (!category && createIfMissing) {
    category = categoryRepo.create({
      storeId,
      name: categoryName.trim(),
      isActive: true,
    })
    await categoryRepo.save(category)
  }

  return category?.id
}

async function findOrCreateSupplier(
  storeId: string,
  supplierName: string,
  createIfMissing: boolean
): Promise<string | undefined> {
  const dataSource = await getDataSource()
  const supplierRepo = dataSource.getRepository(Supplier)

  const normalizedName = supplierName.trim().toLowerCase()

  let supplier = await supplierRepo
    .createQueryBuilder('supplier')
    .where('supplier.storeId = :storeId', { storeId })
    .andWhere('LOWER(supplier.name) = :name', { name: normalizedName })
    .getOne()

  if (!supplier && createIfMissing) {
    supplier = supplierRepo.create({
      storeId,
      name: supplierName.trim(),
      isActive: true,
    })
    await supplierRepo.save(supplier)
  }

  return supplier?.id
}

export async function importData(
  storeId: string,
  data: {
    products: Record<string, unknown>[]
    categories: Record<string, unknown>[]
    suppliers: Record<string, unknown>[]
  },
  options: ImportOptions = {}
): Promise<ImportResult> {
  const {
    updateExisting = true,
    createCategories = true,
    createSuppliers = true,
  } = options

  const dataSource = await getDataSource()
  const productRepo = dataSource.getRepository(Product)
  const categoryRepo = dataSource.getRepository(Category)
  const supplierRepo = dataSource.getRepository(Supplier)
  const barcodeRepo = dataSource.getRepository(ProductBarcode)

  const result: ImportResult = {
    products: { created: 0, updated: 0, errors: [] },
    categories: { created: 0, errors: [] },
    suppliers: { created: 0, errors: [] },
  }

  for (const [idx, rowData] of data.categories.entries()) {
    const rowNum = idx + 2
    try {
      const name = parseString(rowData.name)
      if (!name) {
        result.categories.errors.push({ row: rowNum, message: 'Nombre de categoría requerido' })
        continue
      }

      const existing = await categoryRepo
        .createQueryBuilder('category')
        .where('category.storeId = :storeId', { storeId })
        .andWhere('LOWER(category.name) = :name', { name: name.toLowerCase() })
        .getOne()

      if (existing) continue

      const category = categoryRepo.create({
        storeId,
        name,
        description: parseString(rowData.description),
        isActive: true,
      })
      await categoryRepo.save(category)
      result.categories.created++
    } catch (error) {
      result.categories.errors.push({
        row: rowNum,
        message: error instanceof Error ? error.message : 'Error desconocido',
      })
    }
  }

  for (const [idx, rowData] of data.suppliers.entries()) {
    const rowNum = idx + 2
    try {
      const name = parseString(rowData.name)
      if (!name) {
        result.suppliers.errors.push({ row: rowNum, message: 'Nombre de proveedor requerido' })
        continue
      }

      const existing = await supplierRepo
        .createQueryBuilder('supplier')
        .where('supplier.storeId = :storeId', { storeId })
        .andWhere('LOWER(supplier.name) = :name', { name: name.toLowerCase() })
        .getOne()

      if (existing) continue

      const supplier = supplierRepo.create({
        storeId,
        name,
        contactPerson: parseString(rowData.contactPerson),
        email: parseString(rowData.email),
        phone: parseString(rowData.phone),
        taxId: parseString(rowData.taxId),
        address: parseString(rowData.address),
        city: parseString(rowData.city),
        state: parseString(rowData.state),
        country: parseString(rowData.country),
        website: parseString(rowData.website),
        notes: parseString(rowData.notes),
        isActive: true,
      })
      await supplierRepo.save(supplier)
      result.suppliers.created++
    } catch (error) {
      result.suppliers.errors.push({
        row: rowNum,
        message: error instanceof Error ? error.message : 'Error desconocido',
      })
    }
  }

  for (const [idx, rowData] of data.products.entries()) {
    const rowNum = idx + 2
    try {
      const sku = parseString(rowData.sku)
      const name = parseString(rowData.name)

      if (!sku && !name) {
        result.products.errors.push({ row: rowNum, message: 'SKU o nombre requerido' })
        continue
      }

      let product: Product | null = null

      if (sku) {
        product = await productRepo
          .createQueryBuilder('product')
          .where('product.storeId = :storeId', { storeId })
          .andWhere('LOWER(product.sku) = :sku', { sku: sku.toLowerCase() })
          .getOne()
      }

      if (!product && name) {
        product = await productRepo
          .createQueryBuilder('product')
          .where('product.storeId = :storeId', { storeId })
          .andWhere('LOWER(product.name) = :name', { name: name.toLowerCase() })
          .getOne()
      }

      const categoryName = parseString(rowData.category)
      let categoryId: string | undefined
      if (categoryName) {
        categoryId = await findOrCreateCategory(storeId, categoryName, createCategories) ?? undefined
      }

      const supplierName = parseString(rowData.supplier)
      let supplierId: string | undefined
      if (supplierName) {
        supplierId = await findOrCreateSupplier(storeId, supplierName, createSuppliers) ?? undefined
      }

      const productData = {
        storeId,
        sku: sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: name || sku || 'Producto sin nombre',
        description: parseString(rowData.description),
        costPrice: parseNumber(rowData.costPrice),
        sellingPrice: parseNumber(rowData.sellingPrice) || parseNumber(rowData.costPrice) * 1.3,
        currentStock: Math.round(parseNumber(rowData.currentStock)),
        minStockLevel: Math.round(parseNumber(rowData.minStockLevel)) || 10,
        unit: parseString(rowData.unit) || 'unidad',
        categoryId,
        supplierId,
        isActive: true,
        trackStock: true,
      }

      if (product && updateExisting) {
        await productRepo.update(product.id, {
          ...productData,
          sku: product.sku,
        })
        result.products.updated++
      } else if (!product) {
        const newProduct = productRepo.create(productData)
        await productRepo.save(newProduct)

        const barcode = parseString(rowData.barcode)
        if (barcode) {
          const newBarcode = barcodeRepo.create({
            productId: newProduct.id,
            barcode,
            isPrimary: true,
          })
          await barcodeRepo.save(newBarcode)
        }

        result.products.created++
      }
    } catch (error) {
      result.products.errors.push({
        row: rowNum,
        message: error instanceof Error ? error.message : 'Error desconocido',
      })
    }
  }

  return result
}
