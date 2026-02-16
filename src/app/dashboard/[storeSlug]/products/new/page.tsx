import { ProductForm } from '@/components/products/product-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ categoryId?: string }>
}) {
  const params = await searchParams

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Agregar Nuevo Producto</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Crea un nuevo producto en tu catálogo
        </p>
      </div>

      <ProductForm mode="create" preselectedCategoryId={params.categoryId} />
    </div>
  )
}
