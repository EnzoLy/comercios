'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, Eye, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

interface Quote {
  id: string
  quoteNumber: string
  clientName: string
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  total: number
  createdAt: string
}

interface StatsCard {
  label: string
  value: string | number
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  SENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  EXPIRED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
}

const statusLabels = {
  DRAFT: 'Borrador',
  SENT: 'Enviado',
  ACCEPTED: 'Aceptado',
  REJECTED: 'Rechazado',
  EXPIRED: 'Vencido',
}

export default function QuotesPage() {
  const params = useParams()
  const storeSlug = params.storeSlug as string
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [stats, setStats] = useState({ total: 0, draft: 0, accepted: 0, totalValue: 0 })

  useEffect(() => {
    fetchQuotes()
  }, [search, status, storeSlug])

  const fetchQuotes = async () => {
    try {
      setLoading(true)
      const storeId = await getStoreId()
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (status && status !== 'all') params.append('status', status)

      const res = await fetch(`/api/stores/${storeId}/quotes?${params.toString()}`)
      const data = await res.json()
      setQuotes(data.quotes || [])

      // Calculate stats
      const allQuotes = data.quotes || []
      const draftCount = allQuotes.filter((q: Quote) => q.status === 'DRAFT').length
      const acceptedCount = allQuotes.filter((q: Quote) => q.status === 'ACCEPTED').length
      const totalValue = allQuotes.reduce((sum: number, q: Quote) => sum + q.total, 0)

      setStats({
        total: allQuotes.length,
        draft: draftCount,
        accepted: acceptedCount,
        totalValue,
      })
    } catch (error) {
      console.error('Failed to fetch quotes:', error)
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
      await fetch(`/api/stores/${storeId}/quotes/${deleteId}`, {
        method: 'DELETE',
      })
      setDeleteId(null)
      fetchQuotes()
    } catch (error) {
      console.error('Failed to delete quote:', error)
    }
  }

  const statsCards: StatsCard[] = [
    { label: 'Total de Presupuestos', value: stats.total },
    { label: 'Borradores', value: stats.draft },
    { label: 'Aceptados', value: stats.accepted },
    { label: 'Valor Total', value: formatCurrency(stats.totalValue) },
  ]

  return (
    <div className="p-4 md:p-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Presupuestos</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gestiona las cotizaciones para clientes
            </p>
          </div>
          <Link href={`/dashboard/${storeSlug}/quotes/new`}>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Presupuesto
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
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

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por número, cliente..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="DRAFT">Borrador</SelectItem>
              <SelectItem value="SENT">Enviado</SelectItem>
              <SelectItem value="ACCEPTED">Aceptado</SelectItem>
              <SelectItem value="REJECTED">Rechazado</SelectItem>
              <SelectItem value="EXPIRED">Vencido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-gray-50 dark:bg-gray-900">
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Fecha</TableHead>
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
              ) : quotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No hay presupuestos
                  </TableCell>
                </TableRow>
              ) : (
                quotes.map((quote) => (
                  <TableRow key={quote.id} className="border-b">
                    <TableCell className="font-medium">{quote.quoteNumber}</TableCell>
                    <TableCell>{quote.clientName}</TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[quote.status as keyof typeof statusColors]
                          }`}
                      >
                        {statusLabels[quote.status as keyof typeof statusLabels]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(quote.total)}
                    </TableCell>
                    <TableCell>
                      {new Date(quote.createdAt).toLocaleDateString('es-AR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Link
                          href={`/dashboard/${storeSlug}/quotes/${quote.id}`}
                        >
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteId(quote.id)}
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
            <AlertDialogTitle>Eliminar Presupuesto</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este presupuesto? Esta acción no se puede deshacer.
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
