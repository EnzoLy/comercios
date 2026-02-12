'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useStore } from '@/hooks/use-store'
import { Calendar, Search, AlertTriangle, CheckCircle2, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CreateBatchDialog } from './create-batch-dialog'

interface Batch {
  id: string
  batchNumber?: string
  expirationDate: string
  initialQuantity: number
  currentQuantity: number
  unitCost: number
  product: {
    id: string
    name: string
    sku: string
  }
  createdAt: string
}

export function BatchesTable({ storeSlug }: { storeSlug: string }) {
  const router = useRouter()
  const store = useStore()
  const [batches, setBatches] = useState<Batch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expiring' | 'expired'>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  useEffect(() => {
    if (store) {
      loadBatches()
    }
  }, [store, filterStatus])

  const loadBatches = async () => {
    if (!store) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('limit', '100')

      if (filterStatus === 'expiring') {
        params.append('expiringInDays', '30')
        params.append('showExpired', 'false')
      } else if (filterStatus === 'expired') {
        params.append('showExpired', 'true')
        params.append('expiringInDays', '0')
      } else if (filterStatus === 'active') {
        params.append('showExpired', 'false')
      }

      const response = await fetch(`/api/stores/${store.storeId}/batches?${params}`)

      if (!response.ok) {
        throw new Error('Failed to load batches')
      }

      const data = await response.json()
      setBatches(data.batches || [])
    } catch (error) {
      console.error('Error loading batches:', error)
      toast.error('Error al cargar lotes')
      setBatches([])
    } finally {
      setIsLoading(false)
    }
  }

  const getDaysUntilExpiration = (expirationDate: string) => {
    const now = new Date()
    const expDate = new Date(expirationDate)
    const diffTime = expDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getStatusBadge = (expirationDate: string) => {
    const days = getDaysUntilExpiration(expirationDate)

    if (days < 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Vencido ({Math.abs(days)} días)
        </Badge>
      )
    } else if (days <= 7) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Vence en {days} días
        </Badge>
      )
    } else if (days <= 30) {
      return (
        <Badge className="bg-yellow-600 hover:bg-yellow-700 gap-1">
          <AlertTriangle className="h-3 w-3" />
          Vence en {days} días
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Vigente ({days} días)
        </Badge>
      )
    }
  }

  const filteredBatches = batches.filter((batch) =>
    batch.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.batchNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por producto, SKU o # lote..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los lotes</SelectItem>
            <SelectItem value="active">Solo vigentes</SelectItem>
            <SelectItem value="expiring">Por vencer (30 días)</SelectItem>
            <SelectItem value="expired">Solo vencidos</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Crear Lote Manual
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead># Lote</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="text-right">Cant. Inicial</TableHead>
              <TableHead className="text-right">Cant. Actual</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  Cargando lotes...
                </TableCell>
              </TableRow>
            ) : filteredBatches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  {searchTerm
                    ? 'No se encontraron lotes con ese criterio de búsqueda'
                    : 'No hay lotes registrados. Activa el seguimiento de vencimientos en productos y recibe órdenes de compra.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredBatches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">{batch.product.name}</TableCell>
                  <TableCell className="font-mono text-sm">{batch.product.sku}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {batch.batchNumber || <span className="text-gray-400">-</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {new Date(batch.expirationDate).toLocaleDateString('es-ES')}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{batch.initialQuantity}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {batch.currentQuantity}
                  </TableCell>
                  <TableCell>{getStatusBadge(batch.expirationDate)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateBatchDialog
        isOpen={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false)
          loadBatches()
        }}
      />
    </div>
  )
}
