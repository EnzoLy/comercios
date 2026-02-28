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

// Cache maps to avoid N+1 queries
interface CacheContext {
  categoryCache: Map<string, Category>
  supplierCache: Map<string, Supplier>
  newCategories: Map<string, Category>
  newSuppliers: Map<string, Supplier>
}

async function findOrCreateCategory(
  storeId: string,
  categoryName: string,
  createIfMissing: boolean,
  cache: CacheContext
): Promise<string | undefined> {
  const normalizedName = categoryName.trim().toLowerCase()

  // Check cache first
  if (cache.categoryCache.has(normalizedName)) {
    return cache.categoryCache.get(normalizedName)?.id
  }

  if (cache.newCategories.has(normalizedName)) {
    return cache.newCategories.get(normalizedName)?.id
  }

  if (createIfMissing) {
    const dataSource = await getDataSource()
    const categoryRepo = dataSource.getRepository(Category)
    const category = categoryRepo.create({
      storeId,
      name: categoryName.trim(),
      isActive: true,
    })
    cache.newCategories.set(normalizedName, category)
    return category.id
  }

  return undefined
}

async function findOrCreateSupplier(
  storeId: string,
  supplierName: string,
  createIfMissing: boolean,
  cache: CacheContext
): Promise<string | undefined> {
  const normalizedName = supplierName.trim().toLowerCase()

  // Check cache first
  if (cache.supplierCache.has(normalizedName)) {
    return cache.supplierCache.get(normalizedName)?.id
  }

  if (cache.newSuppliers.has(normalizedName)) {
    return cache.newSuppliers.get(normalizedName)?.id
  }

  if (createIfMissing) {
    const dataSource = await getDataSource()
    const supplierRepo = dataSource.getRepository(Supplier)
    const supplier = supplierRepo.create({
      storeId,
      name: supplierName.trim(),
      isActive: true,
    })
    cache.newSuppliers.set(normalizedName, supplier)
    return supplier.id
  }

  return undefined
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

  // Pre-load all existing categories and suppliers to avoid N+1 queries
  const existingCategories = await categoryRepo.find({
    where: { storeId },
  })
  const existingSuppliers = await supplierRepo.find({
    where: { storeId },
  })
  const existingProducts = await productRepo.find({
    where: { storeId },
    select: ['id', 'storeId', 'sku', 'name'],
  })

  // Create cache maps indexed by normalized names
  const cache: CacheContext = {
    categoryCache: new Map(
      existingCategories.map((cat) => [cat.name.toLowerCase(), cat])
    ),
    supplierCache: new Map(
      existingSuppliers.map((sup) => [sup.name.toLowerCase(), sup])
    ),
    newCategories: new Map(),
    newSuppliers: new Map(),
  }

  // Create a map for quick product lookups by SKU and name
  const productsBySku = new Map(
    existingProducts
      .filter((p) => p.sku)
      .map((p) => [p.sku.toLowerCase(), p])
  )
  const productsByName = new Map(
    existingProducts
      .filter((p) => p.name)
      .map((p) => [p.name.toLowerCase(), p])
  )

  // Bulk insert categories
  const categoriesToSave = data.categories
    .map((rowData, idx) => {
      const rowNum = idx + 2
      try {
        const name = parseString(rowData.name)
        if (!name) {
          result.categories.errors.push({ row: rowNum, message: 'Nombre de categoría requerido' })
          return null
        }

        const normalizedName = name.toLowerCase()
        if (cache.categoryCache.has(normalizedName)) {
          return null // Already exists
        }

        return categoryRepo.create({
          storeId,
          name,
          description: parseString(rowData.description),
          isActive: true,
        })
      } catch (error) {
        result.categories.errors.push({
          row: rowNum,
          message: error instanceof Error ? error.message : 'Error desconocido',
        })
        return null
      }
    })
    .filter((cat) => cat !== null) as Category[]

  if (categoriesToSave.length > 0) {
    const savedCategories = await categoryRepo.save(categoriesToSave)
    result.categories.created += savedCategories.length
    savedCategories.forEach((cat) => {
      cache.categoryCache.set(cat.name.toLowerCase(), cat)
    })
  }

  // Bulk insert suppliers
  const suppliersToSave = data.suppliers
    .map((rowData, idx) => {
      const rowNum = idx + 2
      try {
        const name = parseString(rowData.name)
        if (!name) {
          result.suppliers.errors.push({ row: rowNum, message: 'Nombre de proveedor requerido' })
          return null
        }

        const normalizedName = name.toLowerCase()
        if (cache.supplierCache.has(normalizedName)) {
          return null // Already exists
        }

        return supplierRepo.create({
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
      } catch (error) {
        result.suppliers.errors.push({
          row: rowNum,
          message: error instanceof Error ? error.message : 'Error desconocido',
        })
        return null
      }
    })
    .filter((sup) => sup !== null) as Supplier[]

  if (suppliersToSave.length > 0) {
    const savedSuppliers = await supplierRepo.save(suppliersToSave)
    result.suppliers.created += savedSuppliers.length
    savedSuppliers.forEach((sup) => {
      cache.supplierCache.set(sup.name.toLowerCase(), sup)
    })
  }

  // Process products
  const productsToCreate: Product[] = []
  const productsToUpdate: Array<{ id: string; data: Partial<Product> }> = []
  const barcodesToSave: ProductBarcode[] = []

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
        product = productsBySku.get(sku.toLowerCase()) ?? null
      }

      if (!product && name) {
        product = productsByName.get(name.toLowerCase()) ?? null
      }

      const categoryName = parseString(rowData.category)
      let categoryId: string | undefined
      if (categoryName) {
        categoryId = await findOrCreateCategory(storeId, categoryName, createCategories, cache)
      }

      const supplierName = parseString(rowData.supplier)
      let supplierId: string | undefined
      if (supplierName) {
        supplierId = await findOrCreateSupplier(storeId, supplierName, createSuppliers, cache)
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
        productsToUpdate.push({
          id: product.id,
          data: {
            ...productData,
            sku: product.sku,
          },
        })
        result.products.updated++
      } else if (!product) {
        const newProduct = productRepo.create(productData)
        productsToCreate.push(newProduct)

        const barcode = parseString(rowData.barcode)
        if (barcode) {
          // We'll set the productId after creation
          barcodesToSave.push({
            productId: '', // Will be set after product creation
            barcode,
            isPrimary: true,
          } as any)
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

  // Bulk save products
  if (productsToCreate.length > 0) {
    const savedProducts = await productRepo.save(productsToCreate)

    // Update barcodes with correct product IDs
    for (let i = 0; i < barcodesToSave.length; i++) {
      const barcode = barcodesToSave[i]
      const product = savedProducts[i]
      if (product && barcode) {
        barcode.productId = product.id
      }
    }

    const validBarcodes = barcodesToSave.filter((b) => b.productId)
    if (validBarcodes.length > 0) {
      await barcodeRepo.save(validBarcodes)
    }
  }

  // Bulk update products
  if (productsToUpdate.length > 0) {
    for (const { id, data } of productsToUpdate) {
      await productRepo.update(id, data)
    }
  }

  // Save any new categories and suppliers that were created during processing
  if (cache.newCategories.size > 0) {
    const categoriesToCreate = Array.from(cache.newCategories.values())
    await categoryRepo.save(categoriesToCreate)
  }

  if (cache.newSuppliers.size > 0) {
    const suppliersToCreate = Array.from(cache.newSuppliers.values())
    await supplierRepo.save(suppliersToCreate)
  }

  return result
}
