'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/hooks/use-store'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CategoryForm } from '@/components/categories/category-form'
import { CategoryProductsDialog } from '@/components/categories/category-products-dialog'
import { LoadingPage } from '@/components/ui/loading'
import { Plus, FolderTree, Edit, Trash2, ChevronRight, ChevronDown, Package } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Category {
  id: string
  name: string
  description?: string
  parentId?: string
  sortOrder: number
  isActive: boolean
  children?: Category[]
  _count?: { products: number }
}

export default function CategoriesPage() {
  const store = useStore()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [viewingCategoryProducts, setViewingCategoryProducts] = useState<Category | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (store) {
      loadCategories()
    }
  }, [store])

  const loadCategories = async () => {
    if (!store) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/stores/${store.storeId}/categories`)
      if (!response.ok) throw new Error('Failed to load categories')

      const data = await response.json()
      setCategories(data)
    } catch (error) {
      toast.error('Error al cargar las categorías')
      console.error('Load categories error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingCategory(null)
    setFormOpen(true)
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormOpen(true)
  }

  const handleDelete = async () => {
    if (!store || !deletingCategory) return

    try {
      const response = await fetch(
        `/api/stores/${store.storeId}/categories/${deletingCategory.id}`,
        { method: 'DELETE' }
      )

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Error al eliminar la categoría')
        return
      }

      toast.success('Categoría eliminada exitosamente')
      setDeletingCategory(null)
      loadCategories()
      router.refresh()
    } catch (error) {
      toast.error('Error al eliminar la categoría')
      console.error('Delete error:', error)
    }
  }

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const renderCategory = (category: Category, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0
    const isExpanded = expandedCategories.has(category.id)

    return (
      <div key={category.id} className="border-b last:border-0">
        <div
          className="flex items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-800"
          style={{ paddingLeft: `${level * 24 + 16}px` }}
        >
          <div className="flex items-center gap-2 flex-1">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(category.id)}
                className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-1"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}

            <FolderTree className="h-4 w-4 text-gray-500" />

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{category.name}</span>
                {!category.isActive && <Badge variant="secondary">Inactivo</Badge>}
              </div>
              {category.description && (
                <p className="text-sm text-gray-500">{category.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewingCategoryProducts(category)}
              title="Ver productos de esta categoría"
            >
              <Package className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleEdit(category)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeletingCategory(category)}
            >
              <Trash2 className="h-4 w-4" style={{ color: '#ef4444' }} />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {category.children!.map((child) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const topLevelCategories = categories.filter((c) => !c.parentId)

  if (isLoading) {
    return (
      <LoadingPage
        title="Cargando categorías"
        description="Obteniendo lista de categorías..."
        icon={<FolderTree className="h-8 w-8 text-gray-600" />}
      />
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Categorías</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Organiza tus productos en categorías jerárquicas
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Categoría
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderTree className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay categorías aún</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Crea categorías para organizar tus productos
            </p>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Categoría
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Todas las Categorías ({categories.length})</CardTitle>
            <CardDescription>
              Haz clic en las flechas para expandir/contraer subcategorías
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {topLevelCategories.map((category) => renderCategory(category))}
          </CardContent>
        </Card>
      )}

      <CategoryForm
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingCategory(null)
        }}
        category={editingCategory}
        categories={categories}
        onSuccess={loadCategories}
      />

      <AlertDialog
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Categoría</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar &quot;{deletingCategory?.name}&quot;? Esta acción
              no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CategoryProductsDialog
        isOpen={!!viewingCategoryProducts}
        onClose={() => setViewingCategoryProducts(null)}
        categoryId={viewingCategoryProducts?.id || ''}
        categoryName={viewingCategoryProducts?.name || ''}
        storeId={store?.storeId || ''}
      />
    </div>
  )
}
