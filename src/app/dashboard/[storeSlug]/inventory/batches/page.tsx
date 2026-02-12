import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BatchesTable } from '@/components/batches/batches-table'
import { Calendar, AlertTriangle } from 'lucide-react'

export const metadata = {
  title: 'Gestión de Lotes | Inventario',
  description: 'Gestiona lotes y fechas de vencimiento de productos',
}

export default function BatchesPage({
  params,
}: {
  params: { storeSlug: string }
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Gestión de Lotes
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Administra lotes con fechas de vencimiento para productos perecederos
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lotes Activos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="text-2xl font-bold">...</div>}>
              <BatchStats type="active" />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Vencer (30 días)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="text-2xl font-bold">...</div>}>
              <BatchStats type="expiring" />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="text-2xl font-bold">...</div>}>
              <BatchStats type="expired" />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos los Lotes</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Cargando lotes...</div>}>
            <BatchesTable storeSlug={params.storeSlug} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

// Componente para mostrar estadísticas de lotes
async function BatchStats({ type }: { type: 'active' | 'expiring' | 'expired' }) {
  // Este componente se conectaría a la API para obtener las estadísticas
  // Por ahora, retornamos un placeholder
  return (
    <div>
      <div className="text-2xl font-bold">-</div>
      <p className="text-xs text-muted-foreground">lotes</p>
    </div>
  )
}
