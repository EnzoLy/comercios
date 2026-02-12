import { notFound } from 'next/navigation'
import { getStoreContext } from '@/lib/auth/store-context'
import { getDataSource } from '@/lib/db'
import { Product } from '@/lib/db/entities/product.entity'
import { ProductForm } from '@/components/products/product-form'
import { ProductTaxConfig } from '@/components/products/product-tax-config'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ storeSlug: string; productId: string }>
}) {
  const { storeSlug, productId } = await params
  const context = await getStoreContext(storeSlug)

  if (!context) {
    return null
  }

  const dataSource = await getDataSource()
  const productRepo = dataSource.getRepository(Product)

  const product = await productRepo.findOne({
    where: { id: productId, storeId: context.storeId },
    relations: ['category', 'supplier'],
  })

  if (!product) {
    notFound()
  }

  // Convert to plain object for form
  const productData = {
    name: product.name,
    description: product.description || undefined,
    sku: product.sku,
    barcode: product.barcode || undefined,
    categoryId: product.categoryId || undefined,
    supplierId: product.supplierId || undefined,
    costPrice: Number(product.costPrice),
    sellingPrice: Number(product.sellingPrice),
    currentStock: product.currentStock,
    minStockLevel: product.minStockLevel,
    maxStockLevel: product.maxStockLevel || undefined,
    unit: product.unit || undefined,
    imageUrl: product.imageUrl || undefined,
    trackStock: product.trackStock,
    trackExpirationDates: product.trackExpirationDates,
    isWeighedProduct: product.isWeighedProduct,
    weightUnit: product.weightUnit || undefined,
    isActive: product.isActive,
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Editar Producto</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Actualiza la información del producto
        </p>
      </div>

      <ProductForm mode="edit" product={{ ...productData, id: product.id }} />

      <ProductTaxConfig productId={product.id} />
    </div>
  )
}
