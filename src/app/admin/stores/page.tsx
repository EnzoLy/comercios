'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Store as StoreIcon, Users, CheckCircle, XCircle } from 'lucide-react'
import { CreateStoreDialog } from '@/components/admin/create-store-dialog'

interface Store {
  id: string
  name: string
  slug: string
  isActive: boolean
  owner: { id: string; name: string; email: string }
  createdAt: string
  employmentCount: number
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  useEffect(() => {
    loadStores()
  }, [])

  const loadStores = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/stores')
      if (!response.ok) throw new Error('Failed to load')
      setStores(await response.json())
    } catch (error) {
      toast.error('Error al cargar tiendas')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleStatus = async (storeId: string) => {
    try {
      const response = await fetch(`/api/admin/stores/${storeId}/toggle-status`, {
        method: 'PATCH',
      })
      if (!response.ok) throw new Error('Failed to toggle')

      const updated = await response.json()
      setStores(prev => prev.map(s => s.id === storeId ? { ...s, isActive: updated.isActive } : s))
      toast.success(`Tienda ${updated.isActive ? 'activada' : 'desactivada'}`)
    } catch (error) {
      toast.error('Error al cambiar estado')
    }
  }

  const activeCount = stores.filter(s => s.isActive).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-2">Gestión de Tiendas</h2>
          <p className="text-gray-600 dark:text-gray-400">Administra las tiendas del sistema</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Tienda
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <StoreIcon className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stores.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactivas</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stores.length - activeCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tiendas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Tienda</th>
                  <th className="text-left py-3 px-4 hidden md:table-cell">Owner</th>
                  <th className="text-left py-3 px-4 hidden lg:table-cell">Empleados</th>
                  <th className="text-left py-3 px-4">Estado</th>
                  <th className="text-left py-3 px-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {stores.map(store => (
                  <tr key={store.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-3 px-4">
                      <div className="font-medium">{store.name}</div>
                      <div className="text-sm text-gray-500">/{store.slug}</div>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <div className="text-sm">{store.owner.name}</div>
                      <div className="text-xs text-gray-500">{store.owner.email}</div>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        {store.employmentCount}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={store.isActive ? 'default' : 'secondary'}>
                        {store.isActive ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="outline" size="sm" onClick={() => toggleStatus(store.id)}>
                        {store.isActive ? 'Desactivar' : 'Activar'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <CreateStoreDialog
        isOpen={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false)
          loadStores()
        }}
      />
    </div>
  )
}
