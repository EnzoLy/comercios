'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Store as StoreIcon, Users, CheckCircle, XCircle, Clock, Infinity, DollarSign, Settings2, Trash2 } from 'lucide-react'
import { CreateStoreDialog } from '@/components/admin/create-store-dialog'
import { RecordPaymentDialog } from '@/components/admin/record-payment-dialog'
import { SubscriptionManagementDialog } from '@/components/admin/subscription-management-dialog'
import { DeleteStoreDialog } from '@/components/admin/delete-store-dialog'
import { SubscriptionStatusBadge } from '@/components/admin/subscription-status-badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Store {
  id: string
  name: string
  slug: string
  isActive: boolean
  owner: { id: string; name: string; email: string }
  createdAt: string
  employmentCount: number
  subscription: {
    status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'PERMANENT'
    startDate?: Date | null
    endDate?: Date | null
    isPermanent: boolean
    daysRemaining?: number | null
  }
}

interface SubscriptionStats {
  total: number
  active: number
  expiringSoon: number
  expired: number
  permanent: number
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [filteredStores, setFilteredStores] = useState<Store[]>([])
  const [stats, setStats] = useState<SubscriptionStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [managementDialogOpen, setManagementDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  useEffect(() => {
    loadStores()
    loadStats()
  }, [])

  useEffect(() => {
    filterStores()
  }, [stores, statusFilter])

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

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/subscriptions/stats')
      if (response.ok) {
        setStats(await response.json())
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const filterStores = () => {
    if (statusFilter === 'ALL') {
      setFilteredStores(stores)
    } else {
      setFilteredStores(stores.filter(s => s.subscription.status === statusFilter))
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

  const handleOpenPaymentDialog = (store: Store) => {
    setSelectedStore(store)
    setPaymentDialogOpen(true)
  }

  const handleOpenManagementDialog = (store: Store) => {
    setSelectedStore(store)
    setManagementDialogOpen(true)
  }

  const handleOpenDeleteDialog = (store: Store) => {
    setSelectedStore(store)
    setDeleteDialogOpen(true)
  }

  const handleDialogSuccess = () => {
    loadStores()
    loadStats()
  }

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'N/A'
    try {
      return format(new Date(date), 'dd MMM yyyy', { locale: es })
    } catch {
      return 'N/A'
    }
  }

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
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tiendas</CardTitle>
            <StoreIcon className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || stores.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              {activeCount} activas, {stores.length - activeCount} inactivas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.active || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Suscripciones vigentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Vencer</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.expiringSoon || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Expiran en 7 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiradas</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.expired || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Requieren renovación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permanentes</CardTitle>
            <Infinity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.permanent || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Sin expiración</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Tiendas</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por suscripción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  <SelectItem value="ACTIVE">Activas</SelectItem>
                  <SelectItem value="EXPIRING_SOON">Por Vencer</SelectItem>
                  <SelectItem value="EXPIRED">Expiradas</SelectItem>
                  <SelectItem value="PERMANENT">Permanentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Tienda</th>
                  <th className="text-left py-3 px-4 hidden md:table-cell">Owner</th>
                  <th className="text-left py-3 px-4 hidden xl:table-cell">Empleados</th>
                  <th className="text-left py-3 px-4">Estado</th>
                  <th className="text-left py-3 px-4">Suscripción</th>
                  <th className="text-left py-3 px-4 hidden lg:table-cell">Expira</th>
                  <th className="text-left py-3 px-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredStores.map(store => (
                  <tr key={store.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-3 px-4">
                      <div className="font-medium">{store.name}</div>
                      <div className="text-sm text-gray-500">/{store.slug}</div>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <div className="text-sm">{store.owner.name}</div>
                      <div className="text-xs text-gray-500">{store.owner.email}</div>
                    </td>
                    <td className="py-3 px-4 hidden xl:table-cell">
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
                      <SubscriptionStatusBadge
                        status={store.subscription.status}
                        daysRemaining={store.subscription.daysRemaining}
                      />
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      {store.subscription.isPermanent ? (
                        <span className="text-sm text-blue-600 font-medium">Permanente</span>
                      ) : (
                        <span className="text-sm">
                          {formatDate(store.subscription.endDate)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPaymentDialog(store)}
                          title="Registrar Pago"
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenManagementDialog(store)}
                          title="Gestionar Suscripción"
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDeleteDialog(store)}
                          title="Eliminar Tienda"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredStores.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No hay tiendas con el filtro seleccionado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <CreateStoreDialog
        isOpen={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false)
          loadStores()
          loadStats()
        }}
      />

      {selectedStore && (
        <>
          <RecordPaymentDialog
            isOpen={paymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
            onSuccess={handleDialogSuccess}
            storeId={selectedStore.id}
            storeName={selectedStore.name}
          />

          <SubscriptionManagementDialog
            isOpen={managementDialogOpen}
            onOpenChange={setManagementDialogOpen}
            onSuccess={handleDialogSuccess}
            store={selectedStore}
          />

          <DeleteStoreDialog
            isOpen={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onSuccess={handleDialogSuccess}
            storeId={selectedStore.id}
            storeName={selectedStore.name}
            storeSlug={selectedStore.slug}
          />
        </>
      )}
    </div>
  )
}
