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
import {
  Calendar,
  Search,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Filter,
  Package,
  Clock,
  LayoutGrid,
  FileText
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CreateBatchDialog } from './create-batch-dialog'
import { cn } from '@/lib/utils'

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
        <Badge variant="outline" className="gap-1.5 bg-rose-500/10 text-rose-500 border-rose-500/20 font-black text-[10px] uppercase tracking-tighter">
          <AlertTriangle className="h-3 w-3" />
          Vencido ({Math.abs(days)}d)
        </Badge>
      )
    } else if (days <= 7) {
      return (
        <Badge variant="outline" className="gap-1.5 bg-rose-500/10 text-rose-500 border-rose-500/20 font-black text-[10px] uppercase tracking-tighter shadow-sm animate-pulse">
          <AlertTriangle className="h-3 w-3" />
          Crítico ({days}d)
        </Badge>
      )
    } else if (days <= 30) {
      return (
        <Badge variant="outline" className="gap-1.5 bg-amber-500/10 text-amber-600 border-amber-500/20 font-black text-[10px] uppercase tracking-tighter">
          <Clock className="h-3 w-3" />
          Agotando ({days}d)
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="gap-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-black text-[10px] uppercase tracking-tighter">
          <CheckCircle2 className="h-3 w-3" />
          Vigente ({days}d)
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar por producto, SKU o # lote..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-11 rounded-2xl bg-secondary/30 border-border focus:ring-primary shadow-sm"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
            <SelectTrigger className="w-full md:w-52 h-11 rounded-2xl bg-secondary/30 border-border shadow-sm font-medium">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 opacity-50" />
                <SelectValue placeholder="Estado de lotes" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Todos los lotes</SelectItem>
              <SelectItem value="active">Solo vigentes</SelectItem>
              <SelectItem value="expiring">Por vencer (30 días)</SelectItem>
              <SelectItem value="expired">Solo vencidos</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="h-11 rounded-2xl px-6 font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-[0.98]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Lote
          </Button>
        </div>
      </div>

      <div className="overflow-hidden bg-background/50 border border-border rounded-2xl">
        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Producto</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-muted-foreground">SKU / ID</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-muted-foreground"># Lote</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-muted-foreground text-center">Vencimiento</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase text-muted-foreground">Inicial</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase text-muted-foreground">Actual</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-muted-foreground pl-6">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-24">
                  <div className="flex flex-col items-center justify-center opacity-40 animate-pulse">
                    <LayoutGrid className="h-12 w-12 mb-4" />
                    <p className="font-bold text-sm tracking-widest uppercase">Cargando trazabilidad...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredBatches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-24">
                  <div className="flex flex-col items-center justify-center text-muted-foreground opacity-30 text-center px-8">
                    <FileText className="h-16 w-16 mb-4" />
                    <p className="font-bold text-lg mb-1">Sin registros de lotes</p>
                    <p className="text-sm max-w-md">
                      {searchTerm
                        ? 'No hay lotes que coincidan con tu búsqueda.'
                        : 'Comienza a registrar lotes para habilitar el seguimiento de vencimientos y control FIFO.'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredBatches.map((batch) => (
                <TableRow key={batch.id} className="group hover:bg-secondary/10 transition-colors border-border/30">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center text-primary font-black text-xs uppercase">
                        {batch.product.name.charAt(0)}
                      </div>
                      <span className="font-bold text-sm tracking-tight">{batch.product.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-[10px] uppercase font-bold text-muted-foreground">
                    {batch.product.sku}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-black">
                    {batch.batchNumber || <span className="text-muted-foreground/30 opacity-50 italic">S/N</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-2 bg-secondary/5 px-2 py-1 rounded-lg border border-border">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-bold">{new Date(batch.expirationDate).toLocaleDateString('es-ES')}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-muted-foreground opacity-70 px-4">
                    {batch.initialQuantity}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <div className="inline-flex items-center gap-1.5 font-black text-base">
                      {batch.currentQuantity}
                      {batch.currentQuantity === 0 && (
                        <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-tight py-0 h-4">Agotado</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="pl-6">
                    {getStatusBadge(batch.expirationDate)}
                  </TableCell>
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
