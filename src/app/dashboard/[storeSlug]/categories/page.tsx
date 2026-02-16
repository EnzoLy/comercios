'use client'

import React, { useEffect, useState } from 'react'
import { useStore } from '@/hooks/use-store'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CategoryForm } from '@/components/categories/category-form'
import { CategoryProductsDialog } from '@/components/categories/category-products-dialog'
import { LoadingPage } from '@/components/ui/loading'
import { Plus, ChevronRight, Trash2, Box, Pencil, FolderTree, AlertTriangle, ChevronDown, Package, RefreshCw } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
    setExpandedCategories((prev: Set<string>) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const topLevelCategories = categories.filter((c: Category) => !c.parentId)

  const renderCategoryRows = (category: Category, level: number = 0): React.ReactNode[] => {
    const hasChildren = category.children && category.children.length > 0
    const rows = []

    rows.push(
      <TableRow key={category.id} className="group hover:bg-muted/50 transition-colors border-border/40">
        <TableCell className="py-4">
          <div className="flex items-center gap-3" style={{ paddingLeft: `${level * 24}px` }}>
            <div className={`p-2 rounded-lg border border-border ${level === 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <FolderTree className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className={`font-semibold tracking-tight ${level === 0 ? 'text-base' : 'text-sm opacity-90'}`}>
                {category.name}
              </span>
              {level > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  Nivel {level + 1}
                </span>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <p className="text-sm text-muted-foreground line-clamp-1 max-w-[300px]">
            {category.description || '—'}
          </p>
        </TableCell>
        <TableCell className="text-center">
          <Badge variant="outline" className="font-mono bg-background/50 border-border">
            {category._count?.products || 0}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex justify-center">
            {category.isActive ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 text-[10px] font-bold uppercase px-2">
                Activo
              </Badge>
            ) : (
              <Badge variant="secondary" className="opacity-50 text-[10px] font-bold uppercase px-2">
                Inactivo
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewingCategoryProducts(category)}
              className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
              title="Ver productos"
            >
              <Package className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(category)}
              className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeletingCategory(category)}
              className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    )

    if (hasChildren) {
      category.children!.forEach((child) => {
        rows.push(...renderCategoryRows(child, level + 1))
      })
    }

    return rows
  }

  if (isLoading) {
    return (
      <LoadingPage
        title="Cargando Estructura"
        description="Sincronizando el árbol de categorías..."
        icon={<FolderTree className="h-8 w-8 text-primary animate-pulse" />}
      />
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Professional Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Gestión de Categorías
          </h1>
          <p className="text-sm text-muted-foreground">
            Administre la jerarquía de productos y la organización del catálogo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadCategories} className="h-10 rounded-xl font-medium">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button onClick={handleCreate} className="h-10 rounded-xl px-6 font-bold shadow-sm active:scale-95 transition-all">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Categoría
          </Button>
        </div>
      </div>

      {/* Analytical Tiles (Serious Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-border bg-card/30 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Categorías</p>
          <p className="text-2xl font-bold">{categories.length}</p>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card/30 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Ramas Principales</p>
          <p className="text-2xl font-bold text-primary">{topLevelCategories.length}</p>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card/30 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Productos Asignados</p>
          <p className="text-2xl font-bold">
            {categories.reduce((sum, c) => sum + (c._count?.products || 0), 0)}
          </p>
        </div>
      </div>

      {/* Main Content Area: Table */}
      <Card className="border-border/40 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
        <CardHeader className="bg-muted/30 border-b border-border/40 px-6 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              Catálogo Jerárquico
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FolderTree className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">No hay categorías configuradas.</p>
              <Button variant="link" onClick={handleCreate} className="mt-2 text-primary font-bold">
                Crear la primera ahora
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/20">
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="py-4">Nombre de Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-center">Productos</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topLevelCategories.map((category) => renderCategoryRows(category))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
        onOpenChange={(open: boolean) => !open && setDeletingCategory(null)}
      >
        <AlertDialogContent className="rounded-2xl border-border shadow-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Confirmar Eliminación</AlertDialogTitle>
            <AlertDialogDescription className="text-sm pt-2">
              ¿Está seguro que desea eliminar la categoría <span className="font-bold text-foreground">"{deletingCategory?.name}"</span>?
              <div className="mt-4 p-3 bg-destructive/5 text-destructive rounded-xl border border-destructive/10 text-xs font-medium flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Esta acción es irreversible y afectará la organización de los productos vinculados.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2">
            <AlertDialogCancel className="h-10 rounded-xl font-medium">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="h-10 rounded-xl font-bold bg-destructive hover:bg-destructive/90 text-white"
            >
              Eliminar Permanentemente
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

