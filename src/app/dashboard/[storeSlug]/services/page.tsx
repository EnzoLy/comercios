'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, Edit, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils/currency'
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
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Service {
  id: string
  name: string
  description: string
  price: number
  duration: number
  isActive: boolean
  category?: { name: string }
  createdAt: string
}

interface StatsCard {
  label: string
  value: string | number
}

export default function ServicesPage() {
  const params = useParams()
  const storeSlug = params.storeSlug as string
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [stats, setStats] = useState({ total: 0, active: 0, revenue: 0 })

  useEffect(() => {
    fetchServices()
  }, [search, storeSlug])

  const fetchServices = async () => {
    try {
      setLoading(true)
      const storeId = await getStoreId()
      const res = await fetch(
        `/api/stores/${storeId}/services?search=${search}&includeInactive=true`
      )
      const data = await res.json()
      setServices(data.services || [])

      // Calculate stats
      const active = data.services.filter((s: Service) => s.isActive).length
      setStats({
        total: data.services.length,
        active,
        revenue: 0, // Would calculate from sales data
      })
    } catch (error) {
      console.error('Failed to fetch services:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStoreId = async () => {
    const res = await fetch(`/api/stores?slug=${storeSlug}`)
    const data = await res.json()
    return data[0]?.id
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const storeId = await getStoreId()
      await fetch(`/api/stores/${storeId}/services/${deleteId}`, {
        method: 'DELETE',
      })
      setDeleteId(null)
      fetchServices()
    } catch (error) {
      console.error('Failed to delete service:', error)
    }
  }

  const statsCards: StatsCard[] = [
    { label: 'Total de Servicios', value: stats.total },
    { label: 'Activos', value: stats.active },
    { label: 'Ingresos', value: `$${stats.revenue.toFixed(2)}` },
  ]

  return (
    <div className="p-4 md:p-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Servicios</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona los servicios que ofreces
          </p>
        </div>
        <Link href={`/dashboard/${storeSlug}/services/new`}>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Servicio
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {statsCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border bg-card p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {card.label}
            </p>
            <p className="text-2xl font-bold mt-2">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar servicios..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-gray-50 dark:bg-gray-900">
              <TableHead>Nombre</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : services.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No hay servicios
                </TableCell>
              </TableRow>
            ) : (
              services.map((service) => (
                <TableRow key={service.id} className="border-b">
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>{formatCurrency(service.price)}</TableCell>
                  <TableCell>{service.category?.name || '-'}</TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        service.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {service.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Link
                        href={`/dashboard/${storeSlug}/services/${service.id}`}
                      >
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteId(service.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

        {/* Delete Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogTitle>Eliminar Servicio</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro? Si el servicio tiene ventas asociadas, se desactivará
              en lugar de eliminarse.
            </AlertDialogDescription>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600">
                Eliminar
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
